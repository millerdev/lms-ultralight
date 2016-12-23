import { State } from 'jumpsuit';
import _ from 'lodash';
import axios from 'axios';

const playerState = State('player', {
  initial: {
    isPowerOn: false,
    isPlaying: false,
    loading: false,
  },
});

export default { playerState };
