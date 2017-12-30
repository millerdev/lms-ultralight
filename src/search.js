import { List as IList, Map, Range, Set, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Breadcrumb, Icon, Input, List, Message, Segment } from 'semantic-ui-react'

import { MediaInfo, PlaylistButtons, TrackInfoIcon } from './components'
import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { TouchList } from './touch'
import { timer } from './util'

export const SEARCH_RESULTS = "search results"

export const defaultState = Map({
  isSearching: false,
  name: "",
  query: "",
  results: Map(),
  previous: null,
  error: false,
})

export const reducer = makeReducer({
  mediaSearch: (state, action, query) => {
    if (!query) {
      return defaultState
    }
    return combine(
      state.merge({isSearching: true, query}),
      [effect(doMediaSearch, query)],
    )
  },
  gotMediaSearchResult: (state, action, results) => {
    if (!results) {
      return state.merge({
        isSearching: false,
        error: state.get("query") || true,
      })
    }
    return state.merge({
      isSearching: false,
      name: state.get("query"),
      results: fromJS(results),
      previous: null,
      error: false,
    })
  },
  drillDown: (state, action, item) => {
    return combine(
      state.merge({isSearching: true}),
      [effect(doDrillDown, item)],
    )
  },
  gotDrillDownResult: (state, action, results, name) => {
    if (!results) {
      return state.merge({isSearching: false, error: name || true})
    }
    return state.merge({
      isSearching: false,
      name,
      results: fromJS(results),
      previous: state,
      error: false,
    })
  },
  searchNav: (state, action, previousState) => (
    previousState.merge({isSearching: false})
  ),
}, defaultState)

/**
 * Media search effect
 *
 * @returns a promise that resolves to a gotMediaSearchResult action
 */
const doMediaSearch = (query) => {
  return lms.command("::", "search", 0, 10, "term:" + query, "extended:1")
    .then(json => actions.gotMediaSearchResult(json.data.result))
    .catch(() => actions.gotMediaSearchResult(false))
}

/**
 * Media drill down effect
 *
 * @returns a promise that resolves to a gotDrillDownResult action
 */
const doDrillDown = item => {
  const name = item[item.type]
  const drill = NEXT_SECTION[item.type]
  if (!drill) {
    window.console.log("unknown drill down item", item)
    return actions.gotDrillDownResult(false, name)
  }
  const params = [drill.param + ":" + item[item.type + "_id"]]
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
      return actions.gotDrillDownResult(result, name)
    })
    .catch(err => actions.gotDrillDownResult(false, String(err || name)))
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

export class MediaSearch extends React.Component {
  constructor() {
    super()
    this.timer = timer()
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  onSearch(query) {
    this.timer.clear()
    this.timer.after(350, () => {
      this.props.dispatch(actions.mediaSearch(query))
    }).catch(() => { /* ignore error on clear */ })
  }
  onClearSearch() {
    this.props.dispatch(actions.mediaSearch(""))
    this.input.inputRef.value = ""
    this.input.focus()
  }
  onDrillDown(item) {
    this.props.dispatch(actions.drillDown(item))
  }
  setSearchInput(input) {
    this.input = input
    if (input) {
      // https://stackoverflow.com/a/40235334/10840
      input.focus()
      input.inputRef.select()
    }
  }
  render() {
    const props = this.props
    return <MediaSearchUI
      {...props}
      {...props.search.toObject()}
      onSearch={this.onSearch.bind(this)}
      onClearSearch={this.onClearSearch.bind(this)}
      onDrillDown={this.onDrillDown.bind(this)}
      setSearchInput={this.setSearchInput.bind(this)} />
  }
}

const MediaSearchUI = props => (
  <div>
    <Input
      ref={props.setSearchInput}
      onChange={(e, {value}) => props.onSearch(value)}
      className="icon"
      icon={{
        name: props.query ? "x" : "search",
        link: !!props.query,
        onClick: props.onClearSearch,
      }}
      loading={props.isSearching}
      placeholder="Search..."
      fluid />
    <MediaSearchNav
      name={props.name}
      previous={props.previous}
      dispatch={props.dispatch} />
    { props.error ?
      <Message size="small" negative>
        <Message.Content>
          <Icon name="warning" size="large" />
          { props.error === true ? "Error" : props.error }
        </Message.Content>
      </Message> : null}
    { props.results.get("info") ?
      <MediaInfo
        item={props.results.get("info").toJS()}
        onDrillDown={props.onDrillDown}
        playctl={props.playctl}
        imageSize="tiny" /> : null }
    { props.results.get("count") ? <SearchResults {...props} /> : null }
  </div>
)

export class MediaSearchNav extends React.PureComponent {
  navItems(state, active=true) {
    const prev = state.get("previous")
    const items = prev ? this.navItems(prev, false) : []
    items.push({
      key: String(items.length),
      content: state.get("name"),
      onClick: active ? null : () => this.props.dispatch(actions.searchNav(state)),
      active,
    })
    return items
  }
  render() {
    const {name, previous} = this.props
    return !previous ? null : (
      <Segment className="nav" size="small">
        <Breadcrumb
          sections={this.navItems(Map({name, previous}))}
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

export class SearchResults extends React.Component {
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
    const indexes = Range().values()
    const bySection = Map().asMutable()
    let items = IList().asMutable()
    _.each(SECTIONS, section => {
      if (results.get(section + "s_count")) {
        const sectionItems = results.get(section + "s_loop").map(
          item => item.merge({index: indexes.next().value, type: section})
        )
        bySection.set(section, sectionItems)
        items = items.concat(sectionItems)
      }
    })
    return {
      items: items.asImmutable(),
      itemsBySection: bySection.asImmutable(),
    }
  }
  getSelected(item) {
    const selection = this.state.selection
    if (selection.has(item.index)) {
      return this.state.items
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
    if (!props.playlist.get("numTracks")) {
      this.playItem(item)
    } else if (!props.player.get("isPlaying")) {
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
          const items = bySection.get(section)
          if (items) {
            return [
              <List.Item>
                <List.Header>{SECTION_NAMES[section]}</List.Header>
              </List.Item>
            ].concat(items.map(item => 
              <SearchResult
                onDrillDown={this.props.onDrillDown}
                playItem={this.playItem.bind(this)}
                playNext={ selection.size <= 1 || !selection.has(item.get("index")) ?
                  this.props.playctl.playNext : null}
                addToPlaylist={this.addToPlaylist.bind(this)}
                playOrEnqueue={this.playOrEnqueue.bind(this)}
                item={item.toObject()} />
            ).toArray())
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
