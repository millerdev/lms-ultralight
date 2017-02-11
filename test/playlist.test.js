import { fromJS, Map } from 'immutable'

import * as mod from '../src/playlist'

describe('playlist', function () {
  describe('gotPlayer', function () {
    it('should set current track and playlist metadata', function () {
      const state = mod.gotPlayer(mod.defaultState, STATUS.toJS())
      assert.equal(state, STATE)
    })

    it('should update playlist with playlist query', function () {
      const result = mod.gotPlayer(mod.defaultState, STATUS.merge({
        isPlaylistUpdate: true,
        playlist_loop: PLAYLIST_1,
      }).toJS())
      assert.equal(result, STATE.merge({
        items: PLAYLIST_1,
      }))
    })
  })
})

const STATUS = fromJS({
  "can_seek": 1,
  "digital_volume_control": 1,
  "duration": 371.373,
  "mixer bass": "0",
  "mixer treble": "0",
  "mixer volume": 15,
  "mode": "stop",
  "player_connected": 1,
  "playerid": "1:1:1:1",
  "player_ip": "10.2.1.109:29333",
  "player_name": "Squeezebox",
  "playlist mode": "off",
  "playlist repeat": 2,
  "playlist shuffle": 1,
  "playlist_cur_index": "2",
  "playlist_loop": [
    {
      "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
      "playlist index": 2,
      "title": "Metallic Rain",
      "id": 30349
    }
  ],
  "playlist_timestamp": 1482495558.93241,
  "playlist_tracks": 7,
  "power": 0,
  "rate": 1,
  "seq_no": 0,
  "signalstrength": 81,
  "time": 232.467967245102,
})

const PLAYLIST_1 = fromJS([
  {
    "url": "file:///...",
    "playlist index": 1,
    "title": "song 1",
    "id": 1001
  }, {
    "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
    "playlist index": 2,
    "title": "Metallic Rain",
    "id": 30349
  }, {
    "url": "file:///...",
    "playlist index": 3,
    "title": "song 3",
    "id": 1003
  }
])

const STATE = mod.defaultState.merge({
  timestamp: 1482495558.93241,
  numTracks: 7,
  currentIndex: 2,
  currentTrack: Map({
    "id": 30349,
    "title": "Metallic Rain",
    "playlist index": 2,
    "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
  }),
})
