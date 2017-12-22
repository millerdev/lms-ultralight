import { List as IList, Map, Range, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Button, Input, Item, List, Popup } from 'semantic-ui-react'

import { TrackInfoPopup } from './components'
import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { TouchList } from './touch'
import { timer } from './util'

export const SEARCH_RESULTS = "search results"

export const defaultState = Map({
  isSearching: false,
  query: "",
  results: Map(),
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
    return state.merge({
      isSearching: false,
      results: fromJS(results || {}),
      error: !results,
    })
  },
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
  setSearchInput(input) {
    this.props.setSearchInput(input)
    this.input = input
  }
  render() {
    const props = this.props
    return <MediaSearchUI
      {...props}
      {...props.search.toObject()}
      onSearch={this.onSearch.bind(this)}
      onClearSearch={this.onClearSearch.bind(this)}
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
    { props.results.get("count") ? <SearchResults {...props} /> : null }
  </div>
)

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
  playItem(item) {
    const {playerid, dispatch} = this.props
    lms.playlistControl(playerid, "load", item, dispatch)
    this.hideTrackInfo()
  }
  playNext(item) {
    const {player, playerid, dispatch} = this.props
    lms.playlistControl(playerid, "insert", item, dispatch)
      .then(success => {
        if (success && !player.get("isPlaying")) {
          const loadPlayer = require("./player").loadPlayer
          lms.command(playerid, "playlist", "index", "+1")
            .then(() => loadPlayer(playerid))
            .then(dispatch)
        }
      })
    this.hideTrackInfo()
  }
  addToPlaylist(item) {
    const {playerid, dispatch} = this.props
    lms.playlistControl(playerid, "add", item, dispatch)
    this.hideTrackInfo()
  }
  playOrEnqueue(item) {
    const props = this.props
    if (!props.playlist.get("numTracks")) {
      this.playItem(item)
    } else if (!props.player.get("isPlaying")) {
      this.playNext(item)
    } else {
      this.addToPlaylist(item)
    }
  }
  onSelectionChanged() {
    this.hideTrackInfo()
  }
  setHideTrackInfoCallback(callback) {
    this.hideTrackInfo = callback
  }
  render() {
    const bySection = this.state.itemsBySection
    const hideInfo = this.setHideTrackInfoCallback.bind(this)
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
                playItem={this.playItem.bind(this)}
                playNext={this.playNext.bind(this)}
                addToPlaylist={this.addToPlaylist.bind(this)}
                playOrEnqueue={this.playOrEnqueue.bind(this)}
                setHideTrackInfoCallback={hideInfo}
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
        <TrackInfoPopup {...props}>
          <Item.Header>{item[item.type]}</Item.Header>
          <Item.Extra>
            <Button.Group>
              <IconButton
                icon="play"
                tooltip="Play"
                onClick={() => props.playItem(item)} />
              <IconButton
                icon="step forward"
                tooltip="Play Next"
                onClick={() => props.playNext(item)} />
              <IconButton
                icon="plus"
                tooltip="Add to Playlist"
                onClick={() => props.addToPlaylist(item)} />
            </Button.Group>
          </Item.Extra>
        </TrackInfoPopup>
        {item[item.type]}
      </List.Description>
    </List.Content>
  </TouchList.Item>
}

const IconButton = ({icon, onClick, tooltip}) => (
  <Popup
    trigger={<Button icon={icon} onClick={onClick} />}
    content={tooltip}
    position="bottom center"
    size="tiny"
    inverted
    basic />
)
