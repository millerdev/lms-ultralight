import { fromJS, Map } from 'immutable'

import { effect, getEffects, getState, split } from '../src/effects'
import * as mod from '../src/playlist'

describe('playlist', function () {
  describe('reducer', function () {
    const reduce = mod.reducer
    describe('gotPlayer', function () {
      const gotPlayer = reduce.actions.gotPlayer

      it('should set current track and playlist metadata', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer(STATUS.toJS())))
        assert.equal(state, STATE)
      })

      it('should clear playlist when playlist is empty', function () {
        const data = {
          can_seek: 1,
          digital_volume_control: 1,
          duration: 208.026,
          isPlaylistUpdate: false,
          localTime: 1487467622514,
          "mixer volume": 17,
          mode: "stop",
          player_connected: 1,
          playerid: PLAYERID,
          "playlist mode": "off",
          "playlist repeat": 0,
          "playlist shuffle": 0,
          playlist_tracks: 0,
          power: 0,
          rate: 1,
          seq_no: 0,
          signalstrength: 0,
          time: 0,
        }
        const state = getState(reduce(STATE, gotPlayer(data)))
        assert.equal(state, mod.defaultState.set("playerid", PLAYERID))
      })

      it('should clear selection on playerid change', function () {
        const data = STATUS.set("playerid", PLAYERID + "1").toJS()
        const state = STATE.set("selection",  Map({1: true, last: "1"}))
        const result = getState(reduce(state, gotPlayer(data)))
        assert.equal(result, state.merge({
          playerid: PLAYERID + "1",
          selection: Map(),
        }))
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
        assert.equal(state, STATE.set("items", STATE.get("items").concat(PLAYLIST_2)))
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
          PLAYERID,
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
          PLAYERID,
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

    describe("playlistItemSelected", function () {
      const playlistItemSelected = reduce.actions.playlistItemSelected

      it('should select item in playlist', function () {
        const state = STATE.set("items", PLAYLIST_1)
        const result = getState(reduce(state, playlistItemSelected(1, "1")))
        assert.equal(result, state.set("selection", Map({1: true, last: "1"})))
      })

      it('should select item that is not first in playlist', function () {
        const state = STATE.set("items", PLAYLIST_1)
        const result = getState(reduce(state, playlistItemSelected(1, "3")))
        assert.equal(result, state.set("selection", Map({3: true, last: "3"})))
      })

      it('should deselect item on select other item', function () {
        const state = STATE.merge({
          items: PLAYLIST_1,
          selection: Map({1: true, last: "1"}),
        })
        const result = getState(reduce(state, playlistItemSelected(1, "3")))
        assert.equal(result, state.set("selection", Map({3: true, last: "3"})))
      })

      it('should select multiple with SINGLE modifier', function () {
        const state = STATE.merge({
          items: PLAYLIST_1,
          selection: Map({1: true, last: "1"}),
        })
        const result = getState(reduce(state, playlistItemSelected(1, "3", mod.SINGLE)))
        assert.equal(result, state.set("selection", Map({
          1: true,
          3: true,
          last: "3",
        })))
      })

      it('should deselect item with SINGLE modifier', function () {
        const state = STATE.merge({
          items: PLAYLIST_1,
          selection: Map({1: true, last: "1"}),
        })
        const result = getState(reduce(state, playlistItemSelected(1, "1", mod.SINGLE)))
        assert.equal(result, state.set("selection", Map({
          1: false,
          last: undefined,
        })))
      })

      it('should select contiguous items with TO_LAST modifier', function () {
        const state = STATE.merge({
          items: PLAYLIST_1,
          selection: Map({1: true, last: "1"}),
        })
        const result = getState(reduce(state, playlistItemSelected(1, "3", mod.TO_LAST)))
        assert.equal(result, state.set("selection", Map({
          1: true,
          2: true,
          3: true,
          last: "3",
        })))
      })
    })

    describe("playlistItemDeleted", function () {
      const del = reduce.actions.playlistItemDeleted
      let state
      before(() => {
        state = STATE.merge({
          items: PLAYLIST_1,
          selection: Map({
            1: true,
            3: true,
            last: "1",
          })
        })
      })

      it('should remove item from playlist', function () {
        const ix = "3"
        const [result, effects] = split(getState(reduce(state, del(ix))))
        assert.equal(result, state.merge({
          items: mod.deleteItem(PLAYLIST_1, ix),
          selection: Map({
            1: true,
            3: false,
            last: "1",
          }),
          numTracks: 6,
        }))
        assert.deepEqual(effects, [])
      })

      it('should remove item from playlist and update other state', function () {
        const ix = "1"
        const [result, effects] = split(getState(reduce(state, del(ix))))
        assert.equal(result, state.merge({
          items: mod.deleteItem(PLAYLIST_1, ix),
          selection: Map({
            1: false,
            3: true, // TODO should -> false
            last: undefined,
          }),
          numTracks: 6,
          currentIndex: 1,
          currentTrack: state.get("currentTrack").set("playlist index", 1),
        }))
        assert.deepEqual(effects, [])
      })

      it('should do nothing if index out of bounds', function () {
        const [result, effects] = split(getState(reduce(state, del("4"))))
        assert.equal(result, state)
        assert.deepEqual(effects, [])
      })
    })
  })

  describe('advanceToNextTrack', function () {
    it('should load player status when next is unknown', function () {
      const state1 = STATE.merge({
        currentIndex: 3,
        items: PLAYLIST_1.slice(2),
      })
      const [state2, effects] = split(mod.advanceToNextTrack(state1))
      assert.equal(state1, state2)
      assert.deepEqual(effects, [
        effect(
          require("../src/player").loadPlayer,
          PLAYERID,
          true,
        )
      ])
    })
  })


  describe('deleteSelection', function () {
    function fakeStore(state) {
      const dispatched = []
      state = Map({playerid: state.get("playerid"), playlist: state})
      return {
        dispatch: action => dispatched.push(action),
        getState: () => state,
        dispatched,
      }
    }
    const lms = {command: (...args) => {
      assert.deepEqual([PLAYERID, "playlist", "delete"], args.slice(0, 3),
        "lms.command args")
      return Promise.resolve()
    }}
    const actions = mod.reducer.actions

    it('should not delete items if nothing is selected', function () {
      const store = fakeStore(STATE.set("items", PLAYLIST_1))
      return mod.deleteSelection(store, lms).then(() => {
        assert.deepEqual(store.dispatched, [])
      })
    })

    it('should delete selected item', function () {
      const store = fakeStore(STATE.set("items", PLAYLIST_1).merge({
        selection: Map({1: true, last: "1"}),
      }))
      return mod.deleteSelection(store, lms).then(() => {
        assert.deepEqual(store.dispatched, [
          actions.playlistItemDeleted("1")
        ])
      })
    })

    it('should delete multiple selected items', function () {
      const store = fakeStore(STATE.set("items", PLAYLIST_1).merge({
        selection: Map({1: true, 2: false, 3: true, last: "1"}),
      }))
      return mod.deleteSelection(store, lms).then(() => {
        assert.deepEqual(store.dispatched, [
          actions.playlistItemDeleted("3"),
          actions.playlistItemDeleted("1"),
        ])
      })
    })
  })
})

const PLAYERID = "1:1:1:1"

const STATUS = fromJS({
  "can_seek": 1,
  "digital_volume_control": 1,
  "duration": 371.373,
  "mixer bass": "0",
  "mixer treble": "0",
  "mixer volume": 15,
  "mode": "stop",
  "player_connected": 1,
  "playerid": PLAYERID,
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
  playerid: PLAYERID,
  timestamp: 1482495558.93241,
  numTracks: 7,
  currentIndex: 2,
  currentTrack: Map({
    "id": 30349,
    "title": "Metallic Rain",
    "playlist index": 2,
    "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
  }),
  items: STATUS.get("playlist_loop"),
})
