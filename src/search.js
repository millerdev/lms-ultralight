import { List as IList, Map, Set, fromJS } from 'immutable'
import _ from 'lodash'
import qs from 'query-string'
import React from 'react'
import { Link, Route } from 'react-router-dom'
import { Breadcrumb, Input, List, Segment } from 'semantic-ui-react'

import { MediaInfo, PlaylistButtons, TrackInfoIcon } from './components'
import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { TouchList } from './touch'
import { operationError, timer } from './util'

export const SEARCH_RESULTS = "search results"

export const defaultState = Map({
  isSearching: false,
})

export const reducer = makeReducer({
  mediaSearch: (state, action, query, ...args) => {
    if (!query) {
      return defaultState
    }
    return combine(
      state.merge({isSearching: true}),
      [effect(doMediaSearch, query, ...args)],
    )
  },
  drillDown: (state, action, ...args) => {
    return combine(
      state.merge({isSearching: true}),
      [effect(doDrillDown, ...args)],
    )
  },
  doneSearching: state => {
    return state.merge({isSearching: false})
  },
  mediaError: (state, action, err, message) => combine(
    state.merge({isSearching: false}),
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

/**
 * Media search effect
 *
 * @returns a promise that resolves to an action
 */
const doMediaSearch = (query, history, location, basePath) => {
  return lms.command("::", "search", 0, 10, "term:" + query, "extended:1")
    .then(json => {
      const path = basePath + "?q=" + query
      const state = {
        name: query,
        query,
        result: json.data.result,
        linkTo: {pathname: basePath, search: "?q=" + query},
        previous: getDefaultNavState(basePath),
      }
      if (location.pathname === basePath) {
        history.replace(path, state)
      } else {
        history.push(path, state)
      }
      return actions.doneSearching()
    })
    .catch(error => actions.mediaError(error))
}

/**
 * Load media item details
 *
 * @returns a promise that resolves to an action
 */
const doDrillDown = (item, history, location, basePath) => {
  const drill = NEXT_SECTION[item.type]
  if (!drill) {
    return actions.operationError("Unknown media item", item)
  }
  const item_id = item[item.type + "_id"]
  const params = [drill.param + ":" + item_id]
  if (drill.tags) {
    params.push("tags:" + drill.tags)
  }
  // TODO pagination
  return lms.command("::", drill.cmd, 0, 100, ...params)
    .then(json => {
      const result = json.data.result
      if (drill.type === "info") {
        result.info = _.reduce(result.songinfo_loop, _.assign, {})
      } else {
        // adapt to MediaSearchResult format
        result[drill.type + "s_count"] = result.count || 0
        result[drill.type + "s_loop"] = _.map(result[drill.loop],
          item => _.assign({
            [drill.type + "_id"]: item.id,
            [drill.type]: drill.title ? item[drill.title] : item.title,
          }, item)
        )
      }
      const path = basePath + "/" + item.type + "/" + item_id
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
    tags: "lj",
  },
  album: {
    cmd: "titles",
    param: "album_id",
    type: "track",
    loop: "titles_loop",
    tags: "c",
  },
  track: {
    cmd: "songinfo",
    param: "track_id",
    type: "info",
    tags: "aAcCdefgiIjJkKlLmMnopPDUqrROSstTuvwxXyY",
  }
}

const actions = reducer.actions

export const MediaSearch = props => {
  const {basePath} = props
  const path = basePath + "/:type(track|album|contributor|genre)/:id"
  return (
    <Route path={path} children={route => (
      <RoutedMediaSearch {...props} {...props.search.toObject()} {...route} />
    )} />
  )
}

const IGNORE_DIFF = {playctl: true, match: true}

export class RoutedMediaSearch extends React.Component {
  constructor(props) {
    super(props)
    this.timer = timer()
    this.state = this.updateLocationState(props)
  }
  componentDidMount() {
    this.focusInput()
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  shouldComponentUpdate(props, state) {
    return _.some(this.props, (value, key) =>
        !IGNORE_DIFF[key] && props[key] !== value) ||
      _.some(this.state, (value, key) => state[key] !== value) ||
      !_.isEqual(_.keys(props), _.keys(this.props))
  }
  componentWillReceiveProps(props) {
    const state = this.updateLocationState(props)
    if (state.query !== this.state.query) {
      this.setState(state)
    }
  }
  updateLocationState(props) {
    const {basePath, match, history, location, isSearching} = props
    const state = location.state || {}
    if (match && match.params.id) {
      if (!state.result && !isSearching) {
        const {params: {type, id}} = match
        this.onDrillDown({type, [type + "_id"]: id})
      }
    } else if (location.search) {
      const params = qs.parse(location.search)
      if (params.q && state.query !== params.q && !isSearching) {
        props.dispatch(actions.mediaSearch(
          params.q,
          history,
          location,
          basePath,
        ))
      }
      return {query: params.q || ""}
    }
    return {query: ""}
  }
  onSearch(query) {
    this.setState({query})
    this.timer.clear()
    this.timer.after(350, () => {
      const {history, location, basePath, dispatch} = this.props
      dispatch(actions.mediaSearch(query, history, location, basePath))
    }).catch(() => { /* ignore error on clear */ })
  }
  onClearSearch() {
    const {history, location, basePath} = this.props
    this.setState({query: ""})
    this.props.dispatch(actions.mediaSearch("", history, location, basePath))
    this.input.inputRef.value = ""
    this.input.focus()
  }
  onDrillDown(item) {
    const {history, location, basePath} = this.props
    this.props.dispatch(actions.drillDown(item, history, location, basePath))
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
    const props = this.props
    const {name, result, previous} = props.location.state || {}
    const query = this.state.query
    const onDrillDown = this.onDrillDown.bind(this)
    return <div>
      <Input
        ref={this.setSearchInput.bind(this)}
        value={query}
        onChange={(e, {value}) => this.onSearch(value)}
        className="icon"
        icon={{
          name: query ? "x" : "search",
          link: !!query,
          onClick: () => this.onClearSearch(),
        }}
        loading={props.isSearching}
        placeholder="Search..."
        fluid />
      <MediaNav name={name} previous={previous} />
      { result && result.info ?
        <MediaInfo
          item={result.info}
          onDrillDown={onDrillDown}
          playctl={props.playctl}
          imageSize="tiny"
        /> : null
      }
      { result && result.count ?
        <SearchResults
          {...props}
          results={result}
          onDrillDown={onDrillDown}
        /> : null
      }
    </div>
  }
}

export class MediaNav extends React.PureComponent {
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
    const {name, previous} = this.props
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

const SECTIONS = ["contributor", "album", "track"]
const SECTION_NAMES = {
  contributor: "Artists",
  album: "Albums",
  track: "Songs",
}

export class SearchResults extends React.PureComponent {
  constructor(props) {
    super(props)
    this.state = this.getItems(props.results)
    _.merge(this.state, {selection: Set()})
    this.hideTrackInfo = () => {}
  }
  componentWillReceiveProps(props) {
    if (this.props.results !== props.results) {
      this.setState(this.getItems(props.results))
    }
  }
  getItems(results) {
    const itemsBySection = {}
    if (!results) {
      return {items: IList(), itemsBySection}
    }
    let i = 0
    let items = []
    _.each(SECTIONS, section => {
      if (results[section + "s_count"]) {
        const sectionItems = _.map(results[section + "s_loop"],
          item => _.assign({}, item, {index: i++, type: section})
        )
        items = items.concat(sectionItems)
        itemsBySection[section] = sectionItems
      }
    })
    return {items: fromJS(items), itemsBySection}
  }
  getSelected(item) {
    const selection = this.state.selection
    if (selection.has(item.index)) {
      return this.state.items
        .toSeq()
        .filter(it => selection.has(it.get("index")))
        .map(it => it.toObject())
        .toArray()
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
    return (
      <TouchList
          dataType={SEARCH_RESULTS}
          items={this.state.items}
          onSelectionChanged={this.onSelectionChanged.bind(this)}>
        {_.map(SECTIONS, section => {
          if (bySection.hasOwnProperty(section)) {
            const items = bySection[section]
            return [
              <List.Item>
                <List.Header>{SECTION_NAMES[section]}</List.Header>
              </List.Item>
            ].concat(_.map(items, item =>
              <SearchResult
                onDrillDown={this.props.onDrillDown}
                playItem={this.playItem.bind(this)}
                playNext={ selection.size <= 1 || !selection.has(item.index) ?
                  this.props.playctl.playNext : null}
                addToPlaylist={this.addToPlaylist.bind(this)}
                playOrEnqueue={this.playOrEnqueue.bind(this)}
                item={item} />
            ))
          }
        })}
      </TouchList>
    )
  }
}

const SearchResult = props => {
  const item = props.item
  return <TouchList.Item
      onDoubleClick={() => props.playOrEnqueue(item)}
      index={item.index}
      draggable>
    <List.Content>
      <List.Description className="title">
        <TrackInfoIcon
          {...props}
          icon={item.type === "track" ? null : "plus square outline"}
          onClick={() => props.onDrillDown(item)} />
        <span className="gap-left">{item[item.type]}</span>
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
