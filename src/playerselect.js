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

export function gotPlayers(players) {
  return actions.gotPlayers(players)
}

export const reducer = makeReducer({
  loadPlayers: state => {
    lms.getPlayers().then(({data}) => {
      actions.gotPlayers(data)
    }).catch(() => {
      actions.gotPlayers()
    })
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

const actions = reducer.actions

const loadPlayers = _.throttle(actions.loadPlayers, 30000, {trailing: false})

export const SelectPlayer = props => (
  <Dropdown
    placeholder="Select Player"
    onClick={loadPlayers}
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
