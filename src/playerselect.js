import _ from 'lodash'
import React from 'react'
import { Dropdown } from 'semantic-ui-react'

import * as lms from './lmsclient'

import makeReducer from './store'

export const defaultState = {
  players: [],
  loading: false,
  error: false,
}

export const reducer = makeReducer({
  loadingPlayers: state => ({...state, loading: true}),
  gotPlayers: (state, action, players) => {
    const keeps = ["name", "playerid"]
    return {
      error: !players,
      loading: false,
      players: players ?
        _.map(players, item => _.pick(item, keeps)) : state.players,
    }
  },
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
    options={_.map(props.players, item => ({
      text: item.name,
      value: item.playerid,
    }))}
    value={props.playerid || ""}
    loading={props.loading}
    error={props.error}
    selection />
)
