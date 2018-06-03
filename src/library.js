import _ from 'lodash'
import qs from 'query-string'
import React from 'react'
import Media from 'react-media'
import { Link, Route, matchPath } from 'react-router-dom'
import { Breadcrumb, Input, List, Menu, Segment } from 'semantic-ui-react'

import { MediaInfo, PlaylistButtons, TrackInfoIcon } from './components'
import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { TouchList } from './touch'
import { operationError, timer } from './util'

export const MEDIA_ITEMS = "media items"

export const defaultState = {
  isSearching: false,
}

export const reducer = makeReducer({
  mediaBrowse: (state, action, name, ...args) => {
    return combine(
      {...state, isSearching: true},
      [effect(doMediaBrowse, name, ...args)],
    )
  },
  mediaSearch: (state, action, query, ...args) => {
    if (!query) {
      afterMediaSearch(null, query, ...args)
      return defaultState
    }
    return combine(
      {...state, isSearching: true},
      [effect(doMediaSearch, query, ...args)],
    )
  },
  loadAndShowMediaInfo: (state, action, ...args) => {
    return combine(
      {...state, isSearching: true},
      [effect(_loadAndShowMediaInfo, ...args)],
    )
  },
  doneSearching: state => {
    return {...state, isSearching: false}
  },
  mediaError: (state, action, err, message) => combine(
    {...state, isSearching: false},
    [effect(operationError, message || "Media error", err)],
  ),
}, defaultState)

const getDefaultNavState = basePath => ({
  name: "Menu",
  query: "",
  result: null,
  linkTo: {pathname: basePath},
  previous: null,
})

const doMediaBrowse = (name, history, location, basePath) => {
  const section = BROWSE_SECTIONS[name]
  const params = ["tags", "sort"]
    .filter(name => section.hasOwnProperty(name))
    .map(name => name + ":" + section[name])
  // TODO pagination
  return lms.command("::", section.cmd, 0, 100, ...params)
    .then(json => {
      const result = json.data.result
      adaptMediaItems(result, section)
      const path = basePath + "/" + section.name
      const state = {
        name: section.title,
        section: section.name,
        result,
        linkTo: {pathname: path},
        previous: getDefaultNavState(basePath),
      }
      if (matchPath(location.pathname, {path, exact: true})) {
        history.replace(path, state)
      } else {
        history.push(path, state)
      }
      return actions.doneSearching()
    })
    .catch(error => actions.mediaError(error))
}

/**
 * Media search effect
 *
 * @returns a promise that resolves to an action
 */
const doMediaSearch = (query, ...args) => {
  return lms.command("::", "search", 0, 10, "term:" + query, "extended:1")
    .then(json => {
      afterMediaSearch(json.data.result, query, ...args)
      return actions.doneSearching()
    })
    .catch(error => actions.mediaError(error))
}

/**
 * Update history with search path/query
 */
const afterMediaSearch = (result, query, history, location, basePath) => {
  const path = basePath + (query ? "?q=" + query : "")
  const state = {
    name: query,
    query,
    result,
    linkTo: {pathname: basePath, search: query ? "?q=" + query : ""},
    previous: query ? getDefaultNavState(basePath) : null,
  }
  if (query && matchPath(location.pathname, {path: basePath, exact: true})) {
    history.replace(path, state)
  } else {
    history.push(path, state)
  }
}

/**
 * Load media item details
 *
 * @returns a promise that resolves to an action
 */
const _loadAndShowMediaInfo = (item, history, location, basePath) => {
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
      const path = basePath + "/" + item.type + "/" + (item_id || "")
      const name = item[item.type]
      const state = {
        name: name || (result.info && result.info.title) || "Media",
        query: "",
        result,
        linkTo: {pathname: path},
      }
      if (name === undefined) {
        // loading from URL
        state.previous = getDefaultNavState(basePath)
        history.replace(path, state)
      } else {
        state.previous = location.state || getDefaultNavState(basePath)
        history.push(path, state)
      }
      return actions.doneSearching()
    })
    .catch(error => actions.mediaError(error))
}

const adaptMediaItems = (result, drill) => {
  // adapt to MediaItem format
  result[drill.type + "s_count"] = result.count || 0
  result[drill.type + "s_loop"] = result[drill.loop].map(
    item => _.assign({
      [drill.type + "_id"]: item.id,
      [drill.type]: drill.title ? item[drill.title] : item.title,
    }, item)
  )
}

const BROWSE_SECTIONS = _.chain({
  playlists: {
    cmd: "playlists",
    type: "playlist",
    loop: "playlists_loop",
  }
}).map((info, name) => {
  info.name = name
  if (!info.title) {
    info.title = _.upperFirst(name)
  }
  return [name, info]
}).fromPairs().value()

const NEXT_SECTION = {
  genre: {
    cmd: "artists",
    param: "genre_id",
    type: "contributor",
    loop: "artists_loop",
    title: "artist",
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
        <BrowserHistory state={route.location.state} />
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
  onSearch(query) {
    this.timer.clear()
    this.timer.after(350, () => {
      const {dispatch, history, location, basePath} = this.props
      dispatch(actions.mediaSearch(query, history, location, basePath))
    }).catch(() => { /* ignore error on clear */ })
  }
  onClearSearch() {
    const {dispatch, history, location, basePath} = this.props
    dispatch(actions.mediaSearch("", history, location, basePath))
    this.input.inputRef.value = ""
    this.input.focus()
  }
  setSearchInput(input) {
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
      ref={this.setSearchInput.bind(this)}
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
  navItems(state, active=true) {
    const items = state.previous ? this.navItems(state.previous, false) : []
    const loc = _.assign({state}, state.linkTo)
    items.push({
      key: String(items.length),
      content: active ? state.name : <Link to={loc}>{state.name}</Link>,
      active,
    })
    return items
  }
  render() {
    const {name, previous} = this.props.state || {}
    return !previous ? null : (
      <Segment className="nav" size="small">
        <Breadcrumb
          sections={this.navItems({name, previous})}
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
    const state = props.location.state || {}
    if (!props.isSearching && !state.result) {
      this.updateLocationState(props)
    }
  }
  shouldComponentUpdate(props) {
    return _.some(this.props, (value, key) =>
        !IGNORE_DIFF[key] && props[key] !== value) ||
      !_.isEqual(_.keys(props), _.keys(this.props))
  }
  /**
   * Load location state if missing
   *
   * Asynchronously fetch menu content when loading a path typed into
   * the address bar or from a bookmark or other external link.
   */
  updateLocationState(props) {
    const {basePath, location} = props
    const state = location.state || {}

    const types = _.keys(NEXT_SECTION).join("|")
    const itemMatch = matchPath(location.pathname, {
      path: basePath + "/:type(" + types + ")/:id",
      exact: true,
    })
    if (itemMatch) {
      const {params: {type, id}} = itemMatch
      props.showMediaInfo({type, [type + "_id"]: id})
      return
    }

    const sections = _.keys(BROWSE_SECTIONS).join("|")
    const sectionMatch = matchPath(location.pathname, {
      path: basePath + "/:section(" + sections + ")",
      exact: true,
    })
    if (sectionMatch) {
      this.onBrowse(sectionMatch.params.section)
      return
    }

    if (location.search) {
      const params = qs.parse(location.search)
      if (params.q && state.query !== params.q) {
        props.dispatch(actions.mediaSearch(
          params.q,
          props.history,
          location,
          basePath,
        ))
      }
    }
  }
  onBrowse(section) {
    const {dispatch, history, location, basePath} = this.props
    dispatch(actions.mediaBrowse(section, history, location, basePath))
  }
  render() {
    const props = this.props
    const {result} = props.location.state || {}
    if (result && result.info) {
      return <MediaInfo
        item={result.info}
        playctl={props.playctl}
        imageSize="tiny"
      />
    }
    if (result && result.count) {
      return <MediaItems
        {...props}
        items={result}
        showMediaInfo={props.showMediaInfo}
      />
    }
    return <BrowseMenu
      basePath={props.basePath}
      onBrowse={this.onBrowse.bind(this)}
    />
  }
}

const BrowseMenu = ({ basePath, onBrowse }) => (
  <Menu className="browse-sections" borderless fluid vertical>
    {_.map(BROWSE_SECTIONS, (section, name) => (
      <Menu.Item
        key={name}
        href={basePath + "/" + name}
        onClick={e => {e.preventDefault(); onBrowse(name)}}
      >
        {section.title}
      </Menu.Item>
    ))}
  </Menu>
)

const SECTIONS = ["contributor", "album", "track", "playlist"]
const SECTION_NAMES = {
  contributor: "Artists",
  album: "Albums",
  track: "Songs",
  playlist: "Playlists",
}

export class MediaItems extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = this.getItems(props.items)
    _.merge(this.state, {selection: new Set()})
    this.hideTrackInfo = () => {}
  }
  componentWillReceiveProps(props) {
    if (this.props.items !== props.items) {
      this.setState(this.getItems(props.items))
    }
  }
  getItems(results) {
    const itemsBySection = {}
    if (!results) {
      return {items: [], itemsBySection}
    }
    let i = 0
    let items = []
    _.each(SECTIONS, section => {
      if (results[section + "s_count"]) {
        const sectionItems = results[section + "s_loop"].map(
          item => ({...item, index: i++, type: section})
        )
        items = items.concat(sectionItems)
        itemsBySection[section] = sectionItems
      }
    })
    return {items, itemsBySection}
  }
  getSelected(item) {
    const selection = this.state.selection
    if (selection.has(item.index)) {
      return this.state.items.filter(it => selection.has(it.index))
    }
    return [item]
  }
  playItem(item) {
    this.props.playctl.playItems(this.getSelected(item))
  }
  addToPlaylist(item) {
    this.props.playctl.addToPlaylist(this.getSelected(item))
  }
  playOrEnqueue(item) {
    const props = this.props
    if (!props.numTracks) {
      this.playItem(item)
    } else if (!props.isPlaying) {
      this.props.playctl.playNext(item)
    } else {
      this.addToPlaylist(item)
    }
  }
  onSelectionChanged(selection) {
    this.hideTrackInfo()
    this.setState({selection})
  }
  render() {
    const bySection = this.state.itemsBySection
    const selection = this.state.selection
    return <Media query="(max-width: 500px)">{ smallScreen =>
      <TouchList
          dataType={MEDIA_ITEMS}
          items={this.state.items}
          onSelectionChanged={this.onSelectionChanged.bind(this)}>
        {SECTIONS.map(section => {
          if (bySection.hasOwnProperty(section)) {
            const items = bySection[section]
            const elements = _.keys(bySection).length === 1 ? [] : [
              <List.Item key={section}>
                <List.Header>{SECTION_NAMES[section]}</List.Header>
              </List.Item>
            ]
            return elements.concat(items.map((item, i) =>
              <MediaItem
                smallScreen={smallScreen}
                showMediaInfo={this.props.showMediaInfo}
                playItem={this.playItem.bind(this)}
                playNext={ selection.size <= 1 || !selection.has(item.index) ?
                  this.props.playctl.playNext : null}
                addToPlaylist={this.addToPlaylist.bind(this)}
                playOrEnqueue={this.playOrEnqueue.bind(this)}
                item={item}
                key={item.type + "-" + item[item.type + "_id"] + "-" + i} />
            ))
          }
        })}
      </TouchList>
    }</Media>
  }
}

export class MediaItem extends React.Component {
  shouldComponentUpdate(props) {
    return this.props.item !== props.item
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
