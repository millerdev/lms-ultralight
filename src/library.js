import _ from 'lodash'
import qs from 'query-string'
import React from 'react'
import Media from 'react-media'
import { Link, Route, matchPath } from 'react-router-dom'
import { Breadcrumb, Input, List, Loader, Menu, Segment } from 'semantic-ui-react'

import { MediaInfo, PlaylistButtons, TrackInfoIcon } from './components'
import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { TouchList } from './touch'
import { memoize, operationError, timer } from './util'

export const MEDIA_ITEMS = "media items"

export const defaultState = {
  isLoading: false,
  resultKey: "",
  result: null,
}

export const reducer = makeReducer({
  mediaBrowse: (state, action, section, range) => {
    return combine(
      {...state, key: section, isLoading: true},
      [effect(doMediaBrowse, section, undefined, undefined, range)],
    )
  },
  mediaSearch: (state, action, query, range) => {
    if (!query) {
      return defaultState
    }
    const resultKey = (query.section || "") + "?q=" + query.term
    return combine(
      {...state, resultKey, isLoading: true},
      [effect(doMediaSearch, query, resultKey, range)],
    )
  },
  mediaLoad: (state, action, item, query, range) => {
    const resultKey = item.type + "/" + item.id
    return combine(
      {...state, resultKey, isLoading: true},
      [effect(doMediaLoad, item, query, resultKey, range)],
    )
  },
  gotMedia: (state, action, result, key) => {
    if (state.resultKey === key) {
      result = mergeLoops(state.result, result)
      return {...state, isLoading: false, result}
    }
    return state
  },
  clearMedia: () => defaultState,
  mediaError: (state, action, err, message) => combine(
    {...state, isLoading: false},
    [effect(operationError, message || "Media error", err)],
  ),
}, defaultState)

const doMediaBrowse = (section, search, key="", range=[0, 100]) => {
  const sector = SECTIONS[section]
  const params = ["tags", "sort"]
    .filter(name => _.has(sector, name))
    .map(name => name + ":" + sector[name])
  if (search) {
    params.push(search)
  }
  return lms.command("::", sector.cmd, ...range, ...params)
    .then(json => {
      const result = json.data.result
      return actions.gotMedia(adaptMediaItems(result, sector, range[0]), key)
    })
    .catch(error => actions.mediaError(error))
}

/**
 * Media search effect
 *
 * @returns a promise that resolves to an action
 */
const doMediaSearch = (query, key, range) => {
  if (query.section) {
    return doMediaBrowse(query.section, "search:" + query.term, key, range)
  }
  return lms.command("::", "search", 0, 5, "term:" + query.term, "extended:1")
    .then(({data}) => actions.gotMedia(adaptSearchResult(data.result), key))
    .catch(error => actions.mediaError(error))
}

/**
 * Create media link object
 *
 * `nav` object specification
 * - name: human-readable name (required)
 * - pathspec: location path components object: pathname, search, hash
 *             https://reacttraining.com/react-router/web/api/location
 * - params: query parameters
 * - previous: previous nav object (optional)
 *
 * Other nav-specific keys may be present.
 *
 * Returns an object with two function properties
 * - link: create a <Link> element.
 * - show: load the media item immediately and update history. Suitable
 *    to be used as an onClick handler.
 */
export const mediaInfo = (item, history, basePath, previous) => {
  const { params } = previous || {}
  const pathname = basePath + "/" + item.type + "/" + (item.id || "")
  const search = params ? "?" + qs.stringify(params) : ""
  const nav = {
    name: item.title || "Media",
    pathspec: {pathname, search},
    params: {...params, [item.type]: item.id},
    previous,
  }
  const to = {...nav.pathspec, state: {nav}}
  return {
    link: () => <Link to={to}>{nav.name}</Link>,
    show: () => history.push(getPath(nav.pathspec), {nav}),
  }
}

/**
 * Load media item details
 *
 * @returns a promise that resolves to an action
 */
const doMediaLoad = (item, query, key, range=[0, 100]) => {
  const sector = NEXT_SECTION[item.type]
  if (!sector) {
    return operationError("Unknown media item", item)
  }
  const params = [sector.param + ":" + item.id].concat(
    ["tags", "sort"]
    .filter(name => _.has(sector, name))
    .map(name => name + ":" + sector[name])
  ).concat(taggedParams(query))
  const cmd = _.isArray(sector.cmd) ? sector.cmd : [sector.cmd]
  return lms.command("::", ...cmd, ...range, ...params)
    .then(json => {
      const result = json.data.result
      if (sector.type === "songinfo") {
        const songinfo = _.assign({}, ...result.songinfo_loop)
        songinfo.content_type = songinfo.type
        songinfo.type = "track"
        return actions.gotMedia({songinfo}, key)
      }
      return actions.gotMedia(adaptMediaItems(result, sector, range[0]), key)
    })
    .catch(error => actions.mediaError(error))
}

/**
 * Library result (after adaptation) is a list of objects:
 *  - sector: section descriptor object
 *  - count: total number of matching items in library
 *  - loop: list of item objects, length may be less than count
 *    - id: item id
 *    - type: item type (sector.type)
 *    - title: human-readable name
 *    - index: item index
 *    - [tag]: tag key/value pairs per type
 */
const adaptMediaItems = (result, sector, i=0) => [{
  sector,
  count: result.count || 0,
  loop: (result[sector.section + "_loop"] || []).map(item => ({
    ...item,
    type: sector.type,
    title: item[sector.titleKey] || item.title || item[sector.type],
    index: i++,
  })),
}]

const adaptSearchResult = (result, i=0) => _.chain(result)
  .map((value, key) => {
    const match = /(.+)s_loop/.exec(key)
    if (match) {
      const type = match[1]
      const sector = SECTIONS[typeToSection(type)]
      if (type !== sector.type) {
        window.console.error("sector type mismatch", result, sector)
      }
      return {
        sector,
        count: result[type + "s_count"],
        loop: _.map(value, item => ({
          ...item,
          id: item[type + "_id"],
          type,
          title: item[type],
          index: i++,
        })),
      }
    }
  })
  .filter()
  .sortBy(item => item.sector.index)
  // add "playlists" to allow search in playlists
  // slightly non-intuitive: search, click playlists (searches in playlists)
  .concat([{sector: SECTIONS["playlists"], loop: []}])
  .value()

/**
 * Convert {key: "value", ...} query object to ["key:value", ...]
 */
export const taggedParams = query => _.map(query, (value, key) => {
  const param = QUERY_PARAMS[key]
  return param && param + ":" + value
}).filter(v => v)

const QUERY_PARAMS = {
  // key: NEXT_SECTION[key].param
  genre: "genre_id",
  contributor: "artist_id",
  album: "album_id",
  track: "track_id",
  playlist: "playlist_id",

  // 'q' URL parameter becomes 'term' in BrowserItems.getActionFromLocation
  term: "search",

  // URL parameters may be entered by hand
  library: "library_id",
  artist: "artist_id",
  role: "role_id",
  search: "search",
  compilation: "compilation",
  artist_id: "artist_id",
  role_id: "role_id",
  library_id: "library_id",
  year: "year",
}

function getPath(location) {
  return (
    (location.pathname || "") +
    (location.search || "") +
    (location.hash || "")
  )
}

function getSearchPath(query, basePath) {
  if (_.isString(query)) {
    // for backward compatibility with old history states
    query = {term: query}
  }
  const {section, term} = query || {}
  return {
    pathname: basePath + (section ? "/" + section : ""),
    search: term ? "?q=" + term : "",
  }
}

export function mergeLoops(oldResult, newResult) {
  if (!oldResult || oldResult.length !== newResult.length) {
    return newResult
  }
  const mergeLists = require('./playlist').mergePlaylist
  return _.zip(oldResult, newResult).map(pair => {
    const [one, two] = pair
    if (one.sector !== two.sector) {
      return two
    }
    return {...two, loop: mergeLists(one.loop, two.loop, "index")}
  })
}

const SECTIONS = _.chain([
  {
    section: "artists",
    type: "contributor",
    title: "Artists",
    cmd: "artists",
    titleKey: "artist",
  }, {
    section: "albums",
    type: "album",
    title: "Albums",
    cmd: "albums",
    tags: "alj",  // artist, album, artwork_track_id
  }, {
    section: "titles",
    type: "track",
    title: "Songs",
    cmd: "titles",
    tags: "acjt",  // artist, coverid, artwork_track_id, track
    sort: "tracknum",
  }, {
    section: "playlists",
    type: "playlist",
    title: "Playlists",
    cmd: "playlists",
  },
]).map((info, i) => {
  info.index = i
  return [info.section, info]
}).fromPairs().value()

const TYPE_TO_SECTION = {
  "contributor": "artists",
  "track": "titles",
}
const typeToSection = type => _.get(TYPE_TO_SECTION, type, type + "s")

const NEXT_SECTION = {
  genre: {
    section: "artists",
    type: "contributor",
    titleKey: "artist",
    cmd: "artists",
    param: "genre_id",
  },
  contributor: {
    section: "albums",
    type: "album",
    cmd: "albums",
    param: "artist_id",
    tags: "alj",  // artist, album, artwork_track_id
  },
  album: {
    section: "titles",
    type: "track",
    cmd: "titles",
    param: "album_id",
    tags: "acjt",  // artist, coverid, artwork_track_id, track
    sort: "tracknum",
  },
  track: {
    // section abstraction does not apply to this sector
    section: null,
    type: "songinfo",
    cmd: "songinfo",
    param: "track_id",
    tags: "aAcCdefgiIjJkKlLmMnopPDUqrROSstTuvwxXyY",
  },
  playlist: {
    section: "playlisttracks",
    type: "track",
    cmd: ["playlists", "tracks"],
    param: "playlist_id",
    tags: "acjt",  // artist, coverid, artwork_track_id, track
  },
}

const SECONDARY_INFO = {
  album: item => item.artist || "",
  track: item => item.artist || "",
}

const actions = reducer.actions

export const MediaBrowser = props => {
  return (
    <Route children={route => (
      <div>
        <SearchInput
          {...route}
          basePath={props.basePath}
          dispatch={props.dispatch}
          isLoading={props.isLoading}
          menuDidShow={props.menuDidShow}
        />
        <BrowserHistory
          state={route.location.state}
          result={props.result}
          basePath={props.basePath} />
        <BrowserItems {...props} {...route} />
      </div>
    )} />
  )
}

export class SearchInput extends React.Component {
  constructor(props) {
    super(props)
    this.timer = timer()
    this.input = React.createRef()
    props.menuDidShow.subscribe(() => this.focusInput())
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  onSearch(term) {
    this.timer.clear()
    this.timer.after(350, () => this.doSearch(term))
  }
  onClearSearch() {
    this.input.current.value = ""
    this.input.current.focus()
    this.doSearch()
  }
  doSearch(term) {
    const {history, location, basePath} = this.props
    const query = term && {term}
    const pathspec = getSearchPath(query, basePath)
    const nav = term ? {name: term, term, pathspec} : null
    const isRefine = term && location.search && matchPath(
      location.pathname,
      {path: pathspec.pathname, exact: true},
    )
    const path = getPath(pathspec)
    if (isRefine) {
      history.replace(path, {nav})
    } else {
      history.push(path, {nav})
    }
  }
  focusInput() {
    const input = this.input.current
    if (input !== document.activeElement) {
      // https://stackoverflow.com/a/40235334/10840
      input.focus()
      input.select()
    }
  }
  render() {
    const inputHasValue = !!(this.input.current && this.input.current.value)
    return <Input
      ref={this.input}
      onChange={(e, {value}) => this.onSearch(value)}
      className="icon"
      icon={{
        name: inputHasValue ? "x" : "search",
        link: inputHasValue,
        onClick: () => this.onClearSearch(),
      }}
      loading={this.props.isLoading}
      placeholder="Search..."
      fluid
    />
  }
}

export class BrowserHistory extends React.PureComponent {
  navItems(nav, active=true) {
    if (!nav) {
      return [{key: "0", content: <Link to={this.props.basePath}>Menu</Link>}]
    }
    const items = this.navItems(nav.previous, false)
    const to = {...nav.pathspec, state: {nav}}
    items.push({
      key: String(items.length),
      content: active ? nav.name : <Link to={to}>{nav.name}</Link>,
      active,
    })
    return items
  }
  render() {
    const {nav} = this.props.state || {}
    return !nav && !this.props.result ? null : (
      <Segment className="nav" size="small">
        <Breadcrumb
          sections={this.navItems(nav)}
          icon="right angle"
          size="tiny"
        />
      </Segment>
    )
  }
}

const IGNORE_DIFF = {playctl: true, match: true, mediaInfo: true}

export class BrowserItems extends React.Component {
  constructor(props) {
    super(props)
    const resultKey = this.getResultKey()
    this.state = {nav: undefined, resultKey}
    this.loading = new Set()
    if (!props.isLoading && props.resultKey !== resultKey) {
      props.dispatch(this.getActionFromLocation())
    }
  }
  shouldComponentUpdate(props) {
    return _.some(this.props, (value, key) =>
        !IGNORE_DIFF[key] && props[key] !== value) ||
      !_.isEqual(_.keys(props), _.keys(this.props))
  }
  componentDidUpdate() {
    if (this.isLoading()) {
      this.setState({
        nav: _.get(this.props, "location.state.nav"),
        resultKey: this.getResultKey(),
      })
      this.loading = new Set()  // HACK proper place to reset loading ranges?
      this.props.dispatch(this.getActionFromLocation())
    }
  }
  getResultKey() {
    const {basePath, location} = this.props
    // FIXME path may include extra query string parameters not known
    // to this compnent, which may cause unexpected key mismatch
    const path = getPath(location)
    let key = ""
    if (path.startsWith(basePath)) {
      key = path.slice(basePath.length)
      if (key.startsWith("/")) {
        key = key.slice(1)
      }
    }
    return key
  }
  isLoading() {
    return this.getResultKey() !== this.state.resultKey
  }
  /**
   * Load results based on current location (path and query string)
   */
  getActionFromLocation(range) {
    const {basePath, location} = this.props
    const pathname = location.pathname

    const query = location.search ? qs.parse(location.search) : {}
    if (query.q) {
      query.term = query.q
      delete query.q
    }

    // path: /:type/:id
    const types = _.keys(NEXT_SECTION).join("|")
    const itemMatch = matchPath(pathname, {
      path: basePath + "/:type(" + types + ")/:id",
      exact: true,
    })
    if (itemMatch) {
      return actions.mediaLoad(itemMatch.params, query, range)
    }

    // path: /:section? + ?q=term
    const sections = _.keys(SECTIONS).join("|")
    const sectionPattern = "/:section(" + sections + ")"
    if (query.term) {
      const queryMatch = matchPath(pathname, {
        path: basePath + sectionPattern,
        exact: true,
      })
      if (queryMatch) {
        query.section = queryMatch.params.section
      }
      return actions.mediaSearch(query, range)
    }

    // path: /:section
    const sectionMatch = matchPath(pathname, {
      path: basePath + sectionPattern,
      exact: true,
    })
    if (sectionMatch) {
      return actions.mediaBrowse(sectionMatch.params.section, range)
    }

    return actions.clearMedia()
  }
  mediaInfo = item => this.props.mediaInfo(item, this.state.nav)
  onLoadItems = range => {
    const key = JSON.stringify(range)
    if (!range || this.loading.has(key)) {
      return
    }
    this.loading.add(key)  // HACK maybe buggy way of tracking loading ranges
    const action = this.getActionFromLocation(range)
    setTimeout(() => this.props.dispatch(action), 0)
    // TODO this.loading.delete(key) after range is loaded
  }
  render() {
    const props = this.props
    const result = props.result
    const loading = this.isLoading()
    if (!loading && result) {
      if (result.songinfo) {
        return <MediaInfo
          item={result.songinfo}
          playctl={props.playctl}
          imageSize="tiny"
          mediaInfo={this.mediaInfo}
        />
      }
      return <MediaItems
        {...props}
        items={result}
        mediaInfo={this.mediaInfo}
        onLoadItems={this.onLoadItems}
      />
    }
    return <BrowseMenu basePath={props.basePath} loading={loading} />
  }
}

const BrowseMenu = ({ basePath, loading }) => (
  <Menu className="browse-sections" borderless fluid vertical>
    {_.map(SECTIONS, (sector, name) => {
      const pathname = basePath + "/" + name
      const nav = {name: sector.title, pathspec: {pathname}}
      const loc = {pathname, state: {nav}}
      return <Menu.Item key={name}>
        <Link to={loc} href={pathname}>{sector.title}</Link>
      </Menu.Item>
    })}
    <Loader active={loading} inline="centered" />
  </Menu>
)

export class MediaItems extends React.PureComponent {
  constructor(props) {
    super(props)
    const getItems = memoize(results => {
      if (!results) {
        results = []
      }
      // NOTE selection is cleared any time results
      // change; it's updated by onSelectionChanged and deselect
      return {
        results,
        items: _.flatten(results.map(obj => obj.loop)),
        total: _.sum(results.map(obj => obj.count)),
        selection: new Set(),
      }
    })
    this.getItems = () => getItems(this.props.items)
  }
  getSelected(item) {
    const {items, selection} = this.getItems()
    if (selection.has(item.index)) {
      return items.filter(it => selection.has(it.index))
    }
    return [item]
  }
  deselect = (items) => {
    const indexes = new Set(items.map(item => item.index))
    this.getItems().selection = new Set(
      [...this.getItems().selection].filter(index => !indexes.has(index))
    )
    this.forceUpdate()
  }
  playItem = (item) => {
    this.props.playctl.playItems(this.getSelected(item)).then(this.deselect)
  }
  playNext = (item) => {
    this.props.playctl.playNext(item).then(this.deselect)
  }
  addToPlaylist = (item) => {
    this.props.playctl.addToPlaylist(this.getSelected(item)).then(this.deselect)
  }
  playOrEnqueue = (item) => {
    const props = this.props
    if (!props.numTracks) {
      this.playItem(item)
    } else if (!props.isPlaying) {
      this.playNext(item)
    } else {
      this.addToPlaylist(item)
    }
  }
  getPlayNextFunc = (selection, item) => (
    selection.size <= 1 || !selection.has(item.index) ? this.playNext : null
  )
  onSelectionChanged = (selection) => {
    this.getItems().selection = selection
    this.forceUpdate()
  }
  render() {
    const {results, items, total, selection} = this.getItems()
    return <Media query="(max-width: 500px)">{ smallScreen =>
      <TouchList
          dataType={MEDIA_ITEMS}
          items={items}
          itemsTotal={total}
          selection={selection}
          onSelectionChanged={this.onSelectionChanged}
          onLoadItems={this.props.onLoadItems}>
        {_.map(results, ({sector, loop}) => {
          return (results.length > 1 ? [
            <MediaHeader {...this.props} sector={sector} key={sector.type} />,
          ] : []).concat(loop.map((item, i) =>
            <MediaItem
              smallScreen={smallScreen}
              mediaInfo={this.props.mediaInfo}
              playItem={this.playItem}
              playNext={this.getPlayNextFunc(selection, item)}
              addToPlaylist={this.addToPlaylist}
              playOrEnqueue={this.playOrEnqueue}
              item={item}
              key={item.type + "-" + item.id + "-" + i} />
          ))
        })}
      </TouchList>
    }</Media>
  }
}

export const MediaHeader = ({sector, location, basePath}) => {
  function getContent() {
    const previous = _.get(location, "state.nav", {})
    if (!previous.term) {
      return sector.title
    }
    const query = {term: previous.term, section: sector.section}
    const pathspec = getSearchPath(query, basePath)
    const path = getPath(pathspec)
    const nav = {name: sector.title, pathspec, previous}
    const to = {...pathspec, state: {nav}}
    return <Link to={to} href={path}>{sector.title}</Link>
  }
  return (
    <List.Item>
      <List.Header>
        {getContent()}
      </List.Header>
    </List.Item>
  )
}

export class MediaItem extends React.Component {
  shouldComponentUpdate(props) {
    return (
      this.props.item !== props.item ||
      this.props.playNext !== props.playNext
    )
  }
  render() {
    const props = this.props
    const item = props.item
    const smallScreen = props.smallScreen
    const gap = smallScreen ? null : "gap-left"
    let secondaryInfo = ""
    if (smallScreen && _.has(SECONDARY_INFO, item.type)) {
      secondaryInfo = SECONDARY_INFO[item.type](item)
    }
    return <TouchList.Item
        onDoubleClick={() => props.playOrEnqueue(item)}
        index={item.index}
        draggable>
      <List.Content>
        <List.Description className="title">
          <TrackInfoIcon
            {...props}
            icon={item.type === "track" ? null : "plus square outline"}
            onClick={props.mediaInfo(item).show}
            smallScreen={smallScreen}
          />
          <span className={gap}>{item.title}</span>
          { smallScreen && secondaryInfo ?
            <div className="deemphasize">{secondaryInfo}</div> : null
          }
        </List.Description>
      </List.Content>
      <List.Content className="playlist-controls tap-zone">
        <List.Description>
          <PlaylistButtons
            play={() => props.playItem(item)}
            playNext={props.playNext ? () => props.playNext(item) : null}
            addToPlaylist={() => props.addToPlaylist(item)} />
        </List.Description>
      </List.Content>
    </TouchList.Item>
  }
}
