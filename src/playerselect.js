import _ from 'lodash'
import React from 'react'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

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
  <Select
    value={props.playerid || ""}
    onChange={(event) => props.onPlayerSelected(event.target.value)}
    onOpen={() => maybeLoadPlayers(props.dispatch)}
    error={!!props.error}
    displayEmpty
    size="small"
    variant="standard"
    disableUnderline
    renderValue={value => {
      if (!value) return "Select Player"
      const player = _.find(props.players, { playerid: value })
      return player ? player.name : value
    }}
  >
    {_.map(props.players, item => (
      <MenuItem key={item.playerid} value={item.playerid}>{item.name}</MenuItem>
    ))}
  </Select>
)
