import { fromJS, Map } from 'immutable'

import * as mod from '../src/playlist'

describe('playlist', function () {
  describe('reducer', function () {
    describe('gotPlayer', function () {
      it('should not set playlist on non-playlist query', function () {
        const action = {
          type: "gotPlayer",
          payload: STATUS.toJS(),
        }
        const result = mod.reducer(Map(), action)
        assert.equal(result, Map({currentIndex: 2}))
      })

      it('should update playlist with playlist query', function () {
        const action = {
          type: "gotPlayer",
          payload: STATUS.merge({
            isPlaylistUpdate: true,
            playlist_loop: PLAYLIST_1,
          }).toJS(),
        }
        const result = mod.reducer(STATE, action)
        assert.equal(result, STATE.merge({
          currentIndex: 2,
          items: PLAYLIST_1,
        }))
      })

//      it('should add items to end of playlist', function () {
//        const action = {
//          type: "gotPlayer",
//          payload: STATUS.merge({
//            isPlaylistUpdate: true,
//            playlist_loop: PLAYLIST_2,
//          }).toJS(),
//        }
//        const state = STATE.set("items", PLAYLIST_1)
//        const result = mod.reducer(state, action)
//        assert.equal(result, STATE.merge({
//          currentIndex: 2,
//          items: PLAYLIST_1.concat(PLAYLIST_2),
//        }))
//      })
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

//const PLAYLIST_0 = fromJS([
//  {
//    "url": "file:///...",
//    "playlist index": 0,
//    "title": "song 0",
//    "id": 1000
//  }
//])

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

//const PLAYLIST_2 = fromJS([
//  {
//    "url": "file:///...",
//    "playlist index": 4,
//    "title": "song 4",
//    "id": 1004
//  }, {
//    "url": "file:///...",
//    "playlist index": 5,
//    "title": "song 5",
//    "id": 1005
//  }, {
//    "url": "file:///...",
//    "playlist index": 6,
//    "title": "song 6",
//    "id": 1006
//  }
//])

const STATE = mod.defaultState
