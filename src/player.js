import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { Button, Dropdown } from 'semantic-ui-react'

import makeReducer from './store'
import * as lms from './lmsclient'

export const defaultState = Map({
  players: List(),
  playersLoading: false,
  playersError: false,
  isPowerOn: false,
  isPlaying: false,
})

export const reducer = makeReducer({
  loadPlayers: state => {
    lms.getPlayers().then(response => {
      actions.gotPlayers(response.data)
    }).catch(() => {
      actions.gotPlayers()
    })
    return state.set('playersLoading', true)
  },
  gotPlayers: (state, action) => (
    state.withMutations(map => {
      const players = action.payload
      map
        .set('playersError', !players)
        .set('playersLoading', false)
      if (players) {
        map.set('players', fromJS(players))
      }
    })
  ),
  togglePower: state => state.update('isPowerOn', value => !value),
  togglePlayPause: state => state.update('isPlaying', value => !value),
}, defaultState)

const actions = reducer.actions

const IconToggleButton = props => {
  return (<Button
    onClick={props.handleClick}
    icon={props.isOn() ? props.iconOff : props.iconOn}
    />)
}

const onLoadPlayers = _.throttle(actions.loadPlayers, 30000, {trailing: false})

export const Player = props => (
  <div>
    <div>
      <Dropdown
        placeholder="Select Player"
        onClick={onLoadPlayers}
        options={props.players.map(item => ({
          text: item.get("name"),
          value: item.get("playerid"),
        })).toJS()}
        loading={props.playersLoading}
        error={props.playersError}
        selection />
    </div>
    <div>
      <Button.Group basic size="small">
        <Button icon="backward" />
        <IconToggleButton
          isOn={() => props.isPlaying}
          handleClick={actions.togglePlayPause}
          iconOn="play"
          iconOff="pause" />
        <Button icon="forward"/>
      </Button.Group>
      <Button.Group basic size="small">
        <Button icon="repeat" />
        <Button icon="shuffle" />
      </Button.Group>

      <Button basic toggle
        active={props.isPowerOn}
        onClick={actions.togglePower}
        icon="power" />
    </div>
  </div>
)

function mapStateToProps(state) {
  // TODO move playerState reference to app.js
  return state.get('playerState').toObject()
}

export default connect(mapStateToProps)(Player)
