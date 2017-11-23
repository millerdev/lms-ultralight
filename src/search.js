import { List as IList, Map, Range, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Image, Input, List } from 'semantic-ui-react'

import { effect, combine } from './effects'
import * as lms from './lmsclient'
import makeReducer from './store'
import { TouchList } from './touch'
import { timer } from './util'

export const SEARCH_RESULTS = "search results"

export const defaultState = Map({
  isSearching: false,
  results: Map(),
  error: false,
})

export const reducer = makeReducer({
  mediaSearch: (state, action, query) => {
    if (!query) {
      return defaultState
    }
    return combine(
      state.set('isSearching', true),
      [effect(doMediaSearch, query)],
    )
  },
  gotMediaSearchResult: (state, action, results) => {
    return Map({
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
    this.timer.after(200, () => {
      this.props.dispatch(actions.mediaSearch(query))
    }).catch(() => { /* ignore error on clear */ })
  }
  render() {
    const props = this.props
    return <MediaSearchUI
      onSearch={this.onSearch.bind(this)}
      setSearchInput={props.setSearchInput}
      isSearching={props.search.get("isSearching")}
      results={props.search.get("results")} />
  }
}

const MediaSearchUI = props => (
  <div>
    <Input
      ref={props.setSearchInput}
      onChange={(e, {value}) => props.onSearch(value)}
      className="icon"
      icon="search"
      loading={props.isSearching}
      placeholder="Search..."
      fluid />
    { props.results.get("count") ? <SearchResults results={props.results} /> : null }
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
  render() {
    const bySection = this.state.itemsBySection
    return (
      <TouchList dataType={SEARCH_RESULTS} items={this.state.items}>
        {_.map(SECTIONS, section => {
          const items = bySection.get(section)
          if (items) {
            return [
              <List.Item>
                <List.Header>{SECTION_NAMES[section]}</List.Header>
              </List.Item>
            ].concat(items.map(item => 
              <SearchResult
                item={item.toObject()}
                hovering={false} />
            ).toArray())
          }
        })}
      </TouchList>
    )
  }
}

const SearchResult = ({item, hovering}) => (
  <TouchList.Item index={item.index} draggable>
    <List.Content>
      <List.Description className="title">
        {hovering ? // TODO use css to show info icon
          <InfoIcon /> :
          <Image
            ui
            inline
            height="18px"
            width="18px"
            className="track-art gap-right"
            src={lms.getImageUrl(item)} /> }
        {item[item.type]}
      </List.Description>
    </List.Content>
  </TouchList.Item>
)

const InfoIcon = () => (
  <span className="gap-right">
    <Icon name="info" size="large" fitted />
  </span>
)
