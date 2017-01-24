import { shallow } from 'enzyme'
import { fromJS, Map } from 'immutable'
import _ from 'lodash'
import React from 'react'

import { effect, getEffects, getState, split, IGNORE_ACTION } from '../src/effects'
import * as mod from '../src/player'

describe('player', function () {
  describe('playerReducer', function () {
    const reduce = mod.playerReducer
    const defaultState = mod.defaultState.remove("players").remove("playlist")

    describe('gotPlayer', function () {
      const gotPlayer = reduce.actions.gotPlayer

      describe('state', function () {
        it('should set info for current track', function () {
          const state = getState(reduce(Map(), gotPlayer(STATUS.toJS())))
          assert.equal(state, STATE)
        })

        it('should set info for current track with playlist update', function () {
          const state = getState(reduce(Map(), gotPlayer(STATUS.merge({
            isPlaylistUpdate: true,
            playlist_loop: PLAYLIST_1,
          }).toJS())))
          assert.equal(state.remove("playlist"), STATE)
        })

        it('should not change track info with playlist before current track', function () {
          const state = getState(reduce(STATE, gotPlayer(STATUS.merge({
            isPlaylistUpdate: true,
            playlist_loop: PLAYLIST_0,
          }).toJS())))
          assert.equal(state.remove("playlist"), STATE)
        })

        it('should not change track info with playlist after current track', function () {
          const state = getState(reduce(STATE, gotPlayer(STATUS.merge({
            isPlaylistUpdate: true,
            playlist_loop: PLAYLIST_2,
          }).toJS())))
          assert.equal(state.remove("playlist"), STATE)
        })
      })

      describe('effects', function () {
        it('should promise to fetch player status after delay', function () {
          const effects = getEffects(reduce(defaultState, gotPlayer(STATUS.toJS())))
          assert.deepEqual(effects, [
            effect(
              mod.loadPlayerAfter,
              mod.STATUS_INTERVAL * 1000,
              PLAYERID
            )
          ])
        })

        it('should promise to advance to next song', function () {
          const data = STATUS.merge({
            "duration": 371,
            "time": 350,
            "localTime": null,
          }).toJS()
          const [state, effects] = split(reduce(defaultState, gotPlayer(data)))
          assert.deepEqual(effects, [
            effect(
              mod.advanceToNextSong,
              21000,
              state.toObject()
            ),
            effect(
              mod.loadPlayerAfter,
              30000,
              PLAYERID
            )
          ])
        })
      })
    })

    describe('seek', function () {
      const seek = reduce.actions.seek

      it('should update state and cause seek effect', function () {
        const before = Map({
          playerid: PLAYERID,
          elapsedTime: 200,
          localTime: Date.now(),
        })
        const args = {playerid: PLAYERID, value: 140}
        const [state, effects] = split(reduce(before, seek(args)))
        assert.equal(state, Map({
          playerid: PLAYERID,
          elapsedTime: 140,
          localTime: null,
        }))
        assert.deepEqual(effects, [effect(mod.seek, PLAYERID, 140)], 'effects')
      })

      it('should not change state of other player', function () {
        const before = Map({
          playerid: PLAYERID + "2",
          elapsedTime: 200,
          localTime: Date.now(),
        })
        const args = {playerid: PLAYERID, value: 140}
        const [state, effects] = split(reduce(before, seek(args)))
        assert.equal(state, before)
        assert.deepEqual(effects, [])
      })
    })
  })

  describe('secondsToEndOfSong', function () {
    it('should return positive value for not-ended-yet song', function () {
      const result = mod.secondsToEndOfSong({
        elapsedTime: 10.2,
        totalTime: 21.5,
        localTime: null,
      })
      assert.equal(result, 11.3)
    })

    it('should compensate for latency', function () {
      const now = Date.now()
      const result = mod.secondsToEndOfSong({
        elapsedTime: 10,
        totalTime: 20,
        localTime: now - 100,
      }, now)
      assert.equal(result, 9.9)
    })

    it('should return zero for already-ended song', function () {
      const now = Date.now()
      const result = mod.secondsToEndOfSong({
        elapsedTime: 10.2,
        totalTime: 21.5,
        localTime: new Date(now - 120000),
      }, now)
      assert.equal(result, 0)
    })
  })

  describe('loadPlayerAfter', function () {
    it('should increase delay on frequent zero-wait calls', function () {
      const promises = _.map([0, 0, 0, 0, 0, 0, 0, 0], wait => {
        const promise = mod.loadPlayerAfter(wait, PLAYERID)
        return _.extend(promise.then(action => {
          assert.deepEqual(action, IGNORE_ACTION)
          return promise.wait
        }), {clear: promise.clear})
      })
      // clear the last timer
      promises[promises.length - 1].clear(IGNORE_ACTION)
      return Promise.all(promises).then(waits => {
        assert.deepEqual(waits, [0, 1000, 2000, 4000, 8000, 16000, 30000, 30000])
      })
    })
  })

  describe('LiveSeekBar', function () {
    it('should load with elapsed time', function () {
      const dom = shallow(<mod.LiveSeekBar elapsed={100} total={400} />)
      const seeker = dom.find("SeekBar")
      assert.deepEqual(seeker.props().elapsed, 100)
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
  playerid: PLAYERID,
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
