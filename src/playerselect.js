import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { Dropdown } from 'semantic-ui-react'

import * as lms from './lmsclient'
import { loadPlayer } from './player'

import makeReducer from './store'

export const defaultState = Map({
  players: List(),
  loading: false,
  error: false,
})

export function init() {
  const playerid = localStorage.currentPlayer
  lms.getPlayers().then(response => {
    const players = response.data
    actions.gotPlayers(players)
    if (playerid && _.some(players, item => item.playerid === playerid)) {
      loadPlayer(playerid, true)
    } else if (players.length) {
      loadPlayer(players[0].playerid, true)
    }
  })
}

function setCurrentPlayer(playerid) {
  localStorage.currentPlayer = playerid
  loadPlayer(playerid, true)
}

export const reducer = makeReducer({
  loadPlayers: state => {
    lms.getPlayers().then(response => {
      actions.gotPlayers(response.data)
    }).catch(() => {
      actions.gotPlayers()
    })
    return state.set('loading', true)
  },
  gotPlayers: (state, action) => (
    state.withMutations(map => {
      const players = action.payload
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

const onLoadPlayers = _.throttle(actions.loadPlayers, 30000, {trailing: false})

export const SelectPlayer = props => (
  <Dropdown
    placeholder="Select Player"
    onClick={onLoadPlayers}
    onChange={(e, { value }) => setCurrentPlayer(value)}
    options={props.players.map(item => ({
      text: item.get("name"),
      value: item.get("playerid"),
    })).toJS()}
    value={props.playerid || ""}
    loading={props.loading}
    error={props.error}
    selection />
)
