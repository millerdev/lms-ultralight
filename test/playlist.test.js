import { fromJS, Map } from 'immutable'

import { effect, getEffects, getState } from '../src/effects'
import * as mod from '../src/playlist'

describe('playlist', function () {
  describe('reducer', function () {
    const reduce = mod.reducer
    describe('gotPlayer', function () {
      const gotPlayer = reduce.actions.gotPlayer

      it('should set current track and playlist metadata', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer(STATUS.toJS())))
        assert.equal(state, STATE.set("items", STATUS.get("playlist_loop")))
      })

      it('should update playlist with playlist query', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_1,
        }).toJS())))
        assert.equal(state, STATE.merge({
          items: PLAYLIST_1,
        }))
      })

      it('should update playlist', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_1,
        }).toJS())))
        assert.equal(state, STATE.set("items", PLAYLIST_1))
      })

      it('should not change track info with playlist before current track', function () {
        const state = getState(reduce(STATE, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_0,
        }).toJS())))
        assert.equal(state, STATE.set("items", PLAYLIST_0))
      })

      it('should not change track info with playlist after current track', function () {
        const state = getState(reduce(STATE, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
        }).toJS())))
        assert.equal(state, STATE.set("items", PLAYLIST_2))
      })

      it('should not fetch playlist on playlist update and playlist not changed', function () {
        const effects = getEffects(reduce(STATE, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
        }).toJS())))
        assert.deepEqual(effects, [])
      })

      it('should fetch playlist on playlist changed and not playlist update', function () {
        const effects = getEffects(reduce(STATE, gotPlayer(STATUS.merge({
          isPlaylistUpdate: false,
          playlist_tracks: 300,
        }).toJS())))
        assert.deepEqual(effects, [effect(
          require("../src/player").loadPlayer,
          "1:1:1:1",
          true,
        )])
      })

      it('should fetch playlist on playlist changed and update after current track', function () {
        const effects = getEffects(reduce(STATE, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
          playlist_tracks: 300,
        }).toJS())))
        assert.deepEqual(effects, [effect(
          require("../src/player").loadPlayer,
          "1:1:1:1",
          true,
        )])
      })

      it('should add items to end of playlist', function () {
        const state = STATE.set("items", PLAYLIST_1)
        const result = getState(reduce(state, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
        }).toJS())))
        assert.equal(result, STATE.merge({
          currentIndex: 2,
          items: PLAYLIST_1.concat(PLAYLIST_2),
        }))
      })

      it('should merge items with same index into playlist', function () {
        const state = STATE.set("items", PLAYLIST_1)
        const result = getState(reduce(state, gotPlayer(STATUS.merge({
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_OVERLAP,
        }).toJS())))
        assert.equal(result, STATE.merge({
          currentIndex: 2,
          items: PLAYLIST_1.pop().concat(PLAYLIST_OVERLAP),
        }))
      })
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

const PLAYLIST_0 = fromJS([
  {
    "url": "file:///...",
    "playlist index": 0,
    "title": "song 0",
    "id": 1000
  }
])

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


const PLAYLIST_OVERLAP = fromJS([
  {
    "url": "file:///...",
    "playlist index": 3,
    "title": "song 4",
    "id": 1004
  }, {
    "url": "file:///...",
    "playlist index": 4,
    "title": "song 5",
    "id": 1005
  }, {
    "url": "file:///...",
    "playlist index": 5,
    "title": "song 6",
    "id": 1006
  }
])

const PLAYLIST_2 = fromJS([
  {
    "url": "file:///...",
    "playlist index": 4,
    "title": "song 4",
    "id": 1004
  }, {
    "url": "file:///...",
    "playlist index": 5,
    "title": "song 5",
    "id": 1005
  }, {
    "url": "file:///...",
    "playlist index": 6,
    "title": "song 6",
    "id": 1006
  }
])

const STATE = mod.defaultState.merge({
  playerid: "1:1:1:1",
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
