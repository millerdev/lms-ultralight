import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Dropdown } from 'semantic-ui-react'

import * as lms from './lmsclient'

import makeReducer from './store'

export const defaultState = Map({
  players: List(),
  loading: false,
  error: false,
})

export const reducer = makeReducer({
  loadingPlayers: state => {
    return state.set('loading', true)
  },
  gotPlayers: (state, action, players) => (
    state.withMutations(map => {
      map
        .set('error', !players)
        .set('loading', false)
      if (players) {
        const keeps = ["name", "playerid"]
        map.set('players', fromJS(_.map(players, item => _.pick(item, keeps))))
      }
    })
  ),
}, defaultState)

export const actions = reducer.actions

export function loadPlayers(dispatch) {
  dispatch(actions.loadingPlayers())
  return lms.getPlayers().then(data => {
    dispatch(actions.gotPlayers(data))
    return data
  }).catch(error => {
    window.console.log(error)
    dispatch(actions.gotPlayers())
    return []
  })
}

const maybeLoadPlayers = _.throttle(loadPlayers, 30000, {trailing: false})

export const SelectPlayer = props => (
  <Dropdown
    placeholder="Select Player"
    onClick={() => maybeLoadPlayers(props.dispatch)}
    onChange={(e, { value }) => props.onPlayerSelected(value)}
    options={props.players.map(item => ({
      text: item.get("name"),
      value: item.get("playerid"),
    })).toJS()}
    value={props.playerid || ""}
    loading={props.loading}
    error={props.error}
    selection />
)
