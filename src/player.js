import React from 'react'
import { connect } from 'react-redux'
import { Button } from 'semantic-ui-react'

import makeActor from './store'

const actions = {
  togglePlayPause: makeActor("togglePlayPause"),
}

const defaultState = {
  isPowerOn: false,
  isPlaying: false,
}

function reducer(state=defaultState, action) {
  if (action.type === "togglePlayPause") {
    return {
      isPlaying: !state.isPlaying,
      isPowerOn: state.isPowerOn,
    }
  }
  return state
}
reducer.actions = actions
export { reducer }

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
    
    <Button icon="power" basic />
  </div>
)

function mapStateToProps(state) {
  // TODO move playerState reference to app.js
  return state.playerState
}

export default connect(mapStateToProps)(Player)
