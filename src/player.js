import React from 'react';
import { Button } from 'semantic-ui-react';

let playing = false;

function togglePlayPause() {
  playing = !playing;
}

const IconToggleButton = props => {
  return (<Button
    onClick={props.handleClick}
    icon={ props.isOn() ? props.iconOff : props.iconOn }
    />);
};

export default props => (
  <div>
    <Button.Group basic size="small">
      <Button icon="backward" />
      <IconToggleButton
        isOn={() => playing}
        handleClick={togglePlayPause}
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
);
