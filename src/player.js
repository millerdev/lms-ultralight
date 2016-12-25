import { Map } from 'immutable'
import React from 'react'
import { connect } from 'react-redux'
import { Button } from 'semantic-ui-react'

import makeReducer from './store'

const defaultState = Map({
  isPowerOn: false,
  isPlaying: false,
})

export const reducer = makeReducer({
  togglePower: state => state.update('isPowerOn', value => !value),
  togglePlayPause: state => state.update('isPlaying', value => !value),
}, defaultState)

const actions = reducer.actions

const IconToggleButton = props => {
  return (<Button
    onClick={props.handleClick}
    icon={ props.isOn() ? props.iconOff : props.iconOn }
    />)
}

const Player = props => (
  <div>
    <Button.Group basic size="small">
      <Button icon="backward" />
      <IconToggleButton
        isOn={() => props.isPlaying}
        handleClick={actions.togglePlayPause}
        iconOn="play"
        iconOff="pause" />
      <Button icon="forward" />
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
)

function mapStateToProps(state) {
  // TODO move playerState reference to app.js
  return state.get('playerState').toObject()
}

export default connect(mapStateToProps)(Player)
