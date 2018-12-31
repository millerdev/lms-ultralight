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
  isSearching: false,
  result: null,
}

export const reducer = makeReducer({
  mediaBrowse: (state, action, name) => {
    return combine(
      {...state, isSearching: true},
      [effect(doMediaBrowse, name)],
    )
  },
  mediaSearch: (state, action, query) => {
    if (!query) {
      return defaultState
    }
    return combine(
      {...state, isSearching: true},
      [effect(doMediaSearch, query)],
    )
  },
  mediaLoad: (state, action, item) => {
    return combine(
      {...state, isSearching: true},
      [effect(doMediaLoad, item)],
    )
  },
  doneSearching: (state, action, result) => {
    return {...state, isSearching: false, result}
  },
  mediaError: (state, action, err, message) => combine(
    {...state, isSearching: false},
    [effect(operationError, message || "Media error", err)],
  ),
}, defaultState)

const doMediaBrowse = (name, search) => {
  const section = SECTIONS[name]
  const params = ["tags", "sort"]
    .filter(name => section.hasOwnProperty(name))
    .map(name => name + ":" + section[name])
  if (search) {
    params.push(search)
  }
  // TODO pagination
  return lms.command("::", section.cmd, 0, 100, ...params)
    .then(json => {
      const result = json.data.result
      adaptMediaItems(result, section)
      return actions.doneSearching(result)
    })
    .catch(error => actions.mediaError(error))
}

/**
 * Media search effect
 *
 * @returns a promise that resolves to an action
 */
const doMediaSearch = (query) => {
  if (query.section) {
    return doMediaBrowse(query.section, "search:" + query.term)
  }
  return lms.command("::", "search", 0, 10, "term:" + query.term, "extended:1")
    .then(json => actions.doneSearching(json.data.result))
    .catch(error => actions.mediaError(error))
}

/**
 * Push path for media item
 *
 * `nav` object specification
 * - name: human-readable name (required)
 * - pathspec: location path components object: pathname, search, hash
 *             https://reacttraining.com/react-router/web/api/location
 * - previous: previous nav object (optional)
 *
 * Other nav-specific keys may be present.
 */
export const showMediaInfo = (item, history, basePath, previous) => {
  const item_id = item[item.type + "_id"]
  const path = basePath + "/" + item.type + "/" + (item_id || "")
  const nav = {
    name: item[item.type] || "Media",
    pathspec: {pathname: path},
    previous,
  }
  history.push(path, {nav})
}

/**
 * Load media item details
 *
 * @returns a promise that resolves to an action
 */
const doMediaLoad = item => {
  const drill = NEXT_SECTION[item.type]
  if (!drill) {
    return operationError("Unknown media item", item)
  }
  const item_id = item[item.type + "_id"]
  const params = [drill.param + ":" + item_id].concat(
    ["tags", "sort"]
    .filter(name => drill.hasOwnProperty(name))
    .map(name => name + ":" + drill[name])
  )
  const cmd = _.isArray(drill.cmd) ? drill.cmd : [drill.cmd]
  // TODO pagination
  return lms.command("::", ...cmd, 0, 100, ...params)
    .then(json => {
      const result = json.data.result
      if (drill.type === "info") {
        result.info = _.reduce(result.songinfo_loop, _.assign, {})
      } else {
        adaptMediaItems(result, drill)
      }
      return actions.doneSearching(result)
    })
    .catch(error => actions.mediaError(error))
}

const adaptMediaItems = (result, drill) => {
  // adapt to MediaItem format
  result[drill.type + "s_count"] = result.count || 0
  result[drill.type + "s_loop"] = result[drill.loop].map(
    item => _.assign({
      [drill.type + "_id"]: item.id,
      [drill.type]: drill.nameKey ? item[drill.nameKey] : item.title,
    }, item)
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

const SECTIONS = _.chain({
  artists: {
    type: "contributor",
    nameKey: "artist",
  },
  albums: {
    tags: "alj",  // artist, album, artwork_track_id
  },
  titles: {
    title: "Songs",
    type: "track",
    tags: "acjt",  // artist, coverid, artwork_track_id, track
    sort: "tracknum",
  },
  playlists: {},
}).map((info, name) => {
  info.name = name
  if (!info.title) {
    info.title = _.upperFirst(name)
  }
  if (!info.type) {
    info.type = name.slice(0, -1)
  }
  if (!info.cmd) {
    info.cmd = name
  }
  if (!info.loop) {
    info.loop = name + "_loop"
  }
  return [name, info]
}).fromPairs().value()

const NEXT_SECTION = {
  genre: {
    cmd: "artists",
    param: "genre_id",
    type: "contributor",
    loop: "artists_loop",
    nameKey: "artist",
  },
  contributor: {
    cmd: "albums",
    param: "artist_id",
    type: "album",
    loop: "albums_loop",
    tags: "alj",  // artist, album, artwork_track_id
  },
  album: {
    cmd: "titles",
    param: "album_id",
    type: "track",
    loop: "titles_loop",
    tags: "acjt",  // artist, coverid, artwork_track_id, track
    sort: "tracknum",
  },
  track: {
    cmd: "songinfo",
    param: "track_id",
    type: "info",
    tags: "aAcCdefgiIjJkKlLmMnopPDUqrROSstTuvwxXyY",
  },
  playlist: {
    cmd: ["playlists", "tracks"],
    param: "playlist_id",
    type: "track",
    loop: "playlisttracks_loop",
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
          isSearching={props.isSearching}
        />
        <BrowserHistory
          state={route.location.state}
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
  }
  componentDidMount() {
    this.focusInput()
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  onSearch(term) {
    this.timer.clear()
    this.timer.after(350, () => this.doSearch(term))
  }
  onClearSearch() {
    this.input.inputRef.value = ""
    this.input.focus()
    this.doSearch()
  }
  doSearch(term) {
    const {dispatch, history, location, basePath} = this.props
    const query = term && {term}
    const pathspec = getSearchPath(query, basePath)
    const nav = term ? {name: term, term, pathspec} : null
    const isRefine = term && location.search && matchPath(
      location.pathname,
      {path: pathspec.pathname, exact: true},
    )
    const path = pathspec.pathname + pathspec.search
    if (isRefine) {
      history.replace(path, {nav})
    } else {
      history.push(path, {nav})
    }
  }
  setSearchInput = (input) => {
    this.input = input
    this.focusInput()
  }
  focusInput() {
    const input = this.input
    if (input && input.inputRef !== document.activeElement) {
      // https://stackoverflow.com/a/40235334/10840
      input.focus()
      input.inputRef.select()
    }
  }
  render() {
    const inputHasValue = !!(this.input && this.input.inputRef.value)
    return <Input
      ref={this.setSearchInput}
      onChange={(e, {value}) => this.onSearch(value)}
      className="icon"
      icon={{
        name: inputHasValue ? "x" : "search",
        link: inputHasValue,
        onClick: () => this.onClearSearch(),
      }}
      loading={this.props.isSearching}
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
    return !nav ? null : (
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

const IGNORE_DIFF = {playctl: true, match: true, showMediaInfo: true}

export class BrowserItems extends React.Component {
  constructor(props) {
    super(props)
    this.state = {nav: null}
    if (!props.isSearching && !props.result) {
      const action = this.getActionFromLocation()
      if (action.type !== "doneSearching") {
        props.dispatch(action)
      }
    }
  }
  shouldComponentUpdate(props) {
    return _.some(this.props, (value, key) =>
        !IGNORE_DIFF[key] && props[key] !== value) ||
      !_.isEqual(_.keys(props), _.keys(this.props))
  }
  componentDidUpdate() {
    if (this.isLoading()) {
      const nav = _.get(this.props, "location.state.nav")
      this.setState({nav})
      this.props.dispatch(this.getActionFromLocation(nav))
    }
  }
  isLoading() {
    const nav = _.get(this.props, "location.state.nav")
    return (nav && nav !== this.state.nav) || (this.props.result && !nav)
  }
  /**
   * Load results based on current location (path and query string)
   */
  getActionFromLocation() {
    const {basePath, location} = this.props
    const pathname = location.pathname
    console.log("getActionFromLocation", pathname + location.search)

    // path: /:type/:id
    const types = _.keys(NEXT_SECTION).join("|")
    const itemMatch = matchPath(pathname, {
      path: basePath + "/:type(" + types + ")/:id",
      exact: true,
    })
    if (itemMatch) {
      const {type, id} = itemMatch.params
      const item = {type, [type + "_id"]: id}
      return actions.mediaLoad(item)
    }

    // path: /:section? + ?q=term
    const sections = _.keys(SECTIONS).join("|")
    const sectionPattern = "/:section(" + sections + ")"
    if (location.search) {
      const params = qs.parse(location.search)
      if (params.q) {
        const query = {term: params.q}
        const queryMatch = matchPath(pathname, {
          path: basePath + sectionPattern,
          exact: true,
        })
        if (queryMatch) {
          query.section = queryMatch.params.section
        }
        return actions.mediaSearch(query)
      }
    }

    // path: /:section
    const sectionMatch = matchPath(pathname, {
      path: basePath + sectionPattern,
      exact: true,
    })
    if (sectionMatch) {
      return actions.mediaBrowse(sectionMatch.params.section)
    }

    return actions.doneSearching(null)
  }
  showMediaInfo = item => this.props.showMediaInfo(item, this.state.nav)
  render() {
    const props = this.props
    const result = props.result
    const loading = this.isLoading()
    if (!loading && result) {
      if (result.info) {
        return <MediaInfo
          item={result.info}
          playctl={props.playctl}
          imageSize="tiny"
          showMediaInfo={this.showMediaInfo}
        />
      }
      if (result.count) {
        return <MediaItems
          {...props}
          items={result}
          showMediaInfo={this.showMediaInfo}
        />
      }
    }
    return <BrowseMenu basePath={props.basePath} loading={loading} />
  }
}

const BrowseMenu = ({ basePath, loading }) => (
  <Menu className="browse-sections" borderless fluid vertical>
    {_.map(SECTIONS, (section, name) => {
      const pathname = basePath + "/" + name
      const nav = {name: section.title, pathspec: {pathname}}
      const loc = {pathname, state: {nav}}
      return <Menu.Item key={name}>
        <Link to={loc} href={pathname}>{section.title}</Link>
      </Menu.Item>
    })}
    <Loader active={loading} inline='centered' />
  </Menu>
)

export class MediaItems extends React.PureComponent {
  constructor(props) {
    super(props)
    const getItems = memoize(results => {
      const bySection = {}
      if (!results) {
        return {items: [], bySection}
      }
      let i = 0
      let items = []
      _.each(SECTIONS, section => {
        const type = section.type
        if (results[type + "s_count"]) {
          const sectionItems = results[type + "s_loop"].map(
            item => ({...item, index: i++, type})
          )
          items = items.concat(sectionItems)
          bySection[type] = sectionItems
        }
      })
      // NOTE selection is cleared any time results
      // change; it's updated by onSelectionChanged
      return {items, bySection, selection: new Set()}
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
  playItem = (item) => {
    this.props.playctl.playItems(this.getSelected(item))
  }
  addToPlaylist = (item) => {
    this.props.playctl.addToPlaylist(this.getSelected(item))
  }
  playOrEnqueue = (item) => {
    const props = this.props
    if (!props.numTracks) {
      this.playItem(item)
    } else if (!props.isPlaying) {
      this.props.playctl.playNext(item)
    } else {
      this.addToPlaylist(item)
    }
  }
  onSelectionChanged = (selection) => {
    this.getItems().selection = selection
    this.forceUpdate()
  }
  render() {
    const {items, bySection, selection} = this.getItems()
    const showHeaders = _.keys(bySection).length > 1
    return <Media query="(max-width: 500px)">{ smallScreen =>
      <TouchList
          dataType={MEDIA_ITEMS}
          items={items}
          selection={selection}
          onSelectionChanged={this.onSelectionChanged}>
        {_.map(SECTIONS, section => {
          const type = section.type
          if (bySection.hasOwnProperty(type)) {
            const sectionItems = bySection[type]
            return (showHeaders ? [
              <MediaHeader {...this.props} section={section} key={type} />
            ] : []).concat(sectionItems.map((item, i) =>
              <MediaItem
                smallScreen={smallScreen}
                showMediaInfo={this.props.showMediaInfo}
                playItem={this.playItem}
                playNext={ selection.size <= 1 || !selection.has(item.index) ?
                  this.props.playctl.playNext : null }
                addToPlaylist={this.addToPlaylist}
                playOrEnqueue={this.playOrEnqueue}
                item={item}
                key={item.type + "-" + item[item.type + "_id"] + "-" + i} />
            ))
          } else if (showHeaders) {
            return [
              <MediaHeader {...this.props} section={section} key={type} />
            ]
          }
        })}
      </TouchList>
    }</Media>
  }
}

export const MediaHeader = ({section, location, basePath}) => {
  function getContent() {
    const previous = _.get(location, "state.nav", {})
    if (!previous.term) {
      return section.title
    }
    const query = {term: previous.term, section: section.name}
    const pathspec = getSearchPath(query, basePath)
    const path = pathspec.pathname + pathspec.search
    const nav = {name: section.title, pathspec, previous}
    const to = {...pathspec, state: {nav}}
    return <Link to={to} href={path}>{section.title}</Link>
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
    if (smallScreen && SECONDARY_INFO.hasOwnProperty(item.type)) {
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
            onClick={() => props.showMediaInfo(item)}
            smallScreen={smallScreen}
          />
          <span className={gap}>{item[item.type]}</span>
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
