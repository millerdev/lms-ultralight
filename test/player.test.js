import { fromJS, Map } from 'immutable'
import _ from 'lodash'

import * as mod from '../src/player'

describe('player', function () {
  describe('transformPlayerStatus', function () {
    it('should set info for current track', function () {
      const result = mod.transformPlayerStatus(Map(), STATUS.toJS())
      assert.equal(result, STATE)
    })

    it('should set info for current track with playlist update', function () {
      const result = mod.transformPlayerStatus(Map(), STATUS.merge({
        isPlaylistUpdate: true,
        playlist_loop: PLAYLIST_1,
      }).toJS())
      assert.equal(result.remove("playlist"), STATE)
    })

    it('should not change track info with playlist before current track', function () {
      const result = mod.transformPlayerStatus(STATE, STATUS.merge({
        isPlaylistUpdate: true,
        playlist_loop: PLAYLIST_0,
      }).toJS())
      assert.equal(result.remove("playlist"), STATE)
    })

    it('should not change track info with playlist after current track', function () {
      const result = mod.transformPlayerStatus(STATE, STATUS.merge({
        isPlaylistUpdate: true,
        playlist_loop: PLAYLIST_2,
      }).toJS())
      assert.equal(result.remove("playlist"), STATE)
    })
  })

  describe('Player', function () {
    function fakeTimer() {
      const afters = []
      return {
        afters: afters,
        clear: () => {},
        after: (wait, func) => afters.push({wait, func}),
        next: () => {
          const next = afters.shift()
          next.func()
          return next.wait
        },
      }
    }
    function fakePlayer(obj) {
      const self = _.extend({
        timer: fakeTimer(),
        fetchBackoff: () => 0,
        isPlaylistChanged: () => false,
        setState: value => { self.state = value },
        loadPlayer: () => {},
      }, obj)
      return self
    }
    const Player = mod.Player

    describe('onLoadPlayer', function () {
      const player = new Player()

      it('should set state', function () {
        const self = fakePlayer({isPlaylistChanged: () => true})
        const state = mod.transformPlayerStatus(mod.defaultState, STATUS.toJS())
        assert.equal(self.state, undefined)
        player.onLoadPlayer(self, state)
        assert.deepEqual(self.state, state.toObject())
      })

      it('should set timer to fetch playlist on playlist changed', function () {
        const loaded = []
        const self = fakePlayer({
          isPlaylistChanged: () => true,
          loadPlayer: (playerid, fetch) => loaded.push({playerid, fetch}),
        })
        const state = mod.transformPlayerStatus(mod.defaultState, STATUS.toJS())
        player.onLoadPlayer(self, state)
        assert.equal(self.timer.afters.length, 1, "wrong number of timers")
        assert.equal(self.timer.afters[0].wait, 0, "wrong wait length")
        assert.deepEqual(loaded, [])
        self.timer.next()
        assert.deepEqual(loaded, [{
          playerid: state.get("playerid"),
          fetch: true,
        }])
      })

      it('should increase fetch delay on frequent playlist change', function () {
        const loads = []
        const self = fakePlayer({
          fetchBackoff: player.fetchBackoff,
          isPlaylistChanged: () => true,
        })
        const state = mod.transformPlayerStatus(mod.defaultState, STATUS.toJS())
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 0
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 1000
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 2000
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 4000
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 8000
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 16000
        player.onLoadPlayer(self, state)
        loads.push(self.timer.next())  // 30000
        assert.deepEqual(loads, [0, 1000, 2000, 4000, 8000, 16000, 30000])
      })

      it('should set timer to advance playlist and also to load player status', function () {
        const advances = []
        const loaded = []
        const self = fakePlayer({
          secondsToEndOfSong: () => 15,
          advanceToNextSong: obj => advances.push(obj),
          loadPlayer: (playerid, fetch) => loaded.push({playerid, fetch}),
        })
        const state = mod.transformPlayerStatus(mod.defaultState, STATUS.toJS())
        player.onLoadPlayer(self, state)
        assert.equal(self.timer.afters.length, 2, "wrong number of timers")
        assert.deepEqual(_.map(self.timer.afters, a => a.wait), [15000, 30000])
        // verify advance
        assert.deepEqual(advances, [])
        self.timer.next()
        assert.deepEqual(advances, [state.toObject()])
        // verify next load
        assert.deepEqual(loaded, [])
        self.timer.next()
        assert.deepEqual(loaded, [{
          playerid: state.get("playerid"),
          fetch: false,
        }])
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
  "localTime": new Date(),
  "isPlaylistUpdate": false,
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

const STATE = mod.defaultState.remove("players").remove("playlist").merge({
  playerid: "1:1:1:1",
  repeatMode: 2,
  shuffleMode: 1,
  trackInfo: Map({
    "id": 30349,
    "title": "Metallic Rain",
    "playlist index": 2,
    "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
  }),
  volumeLevel: 15,
  elapsedTime: 232.467967245102,
  totalTime: 371.373,
  localTime: STATUS.get("localTime"),
  playlistTimestamp: 1482495558.93241,
  playlistTracks: 7,
  playlistIndex: 2,
})
