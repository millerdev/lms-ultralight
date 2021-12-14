import _ from 'lodash'

import { rewire } from './util'

import * as mod from '../src/playctl'
import {__RewireAPI__ as module} from '../src/playctl'

describe('playctl', function () {
  describe("playerControl", function () {
    it('should play a single track', function () {
      const playctl = mod.playerControl(PLAYERID, DISPATCH, STATE)
      const items = ["item-1"]
      const actions = []
      return rewireLMS(actions, () =>
        playctl.playItems(items).then(played => {
          assert.deepEqual(actions, ["load item-1"])
          assert.deepEqual(played, items)
        })
      )
    })

    _.each([
      [1, 1, 1],
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
      [0, 0, 0],
    ], bitmap => {
      it('should play and return only played and/or added tracks: ' + bitmap, function () {
        const playctl = mod.playerControl(PLAYERID, DISPATCH, STATE)
        const items = ["item-2", "item-4", "item-6"]
        const actions = []
        const dropFailed = items => _.filter(items, (v, i) => bitmap[i])
        const act = () => (
          playctl.playItems(items).then(played => {
            assert.deepEqual(actions, [
              "load item-2",
              "add item-4",
              "add item-6",
            ])
            assert.deepEqual(played, dropFailed(items))
          })
        )
        return rewireLMS(actions, act, bitmap)
      })
    })

    it('should add multiple tracks to playlist', function () {
      const playctl = mod.playerControl(PLAYERID, DISPATCH, STATE)
      const items = ["item-2", "item-5"]
      const actions = []
      return rewireLMS(actions, () =>
        playctl.addToPlaylist(items).then(added => {
          assert.deepEqual(actions, [
            "add item-2",
            "add item-5",
          ])
          assert.deepEqual(added, items)
        })
      )
    })

    _.each([
      {insert: true, isPlaying: true},
      {insert: true, isPlaying: false},
      {insert: false, isPlaying: false},
    ], bits => it('should play next: ' + JSON.stringify(bits), function () {
      const state = {...STATE, player: bits}
      const playctl = mod.playerControl(PLAYERID, DISPATCH, state)
      const actions = []
      const expect = ["insert item-0"]
      bits.insert && !bits.isPlaying && expect.push("playlist index +1")
      const act = () => playctl.playNext("item-0").then(added => {
        assert.deepEqual(actions, expect)
        assert.deepEqual(added, bits.insert ? ["item-0"] : [])
      })
      return rewireLMS(actions, act, [bits.insert])
    }))
  })
})

function rewireLMS(actions, callback, results) {
  let i = 0
  const nextResult = () => results ? results[i++] : true
  return rewire(module, {
    lms: {
      playlistControl: (playerid, cmd, item, dispatch) => {
        assert.equal(playerid, PLAYERID)
        assert.equal(dispatch, DISPATCH)
        actions.push(cmd + " " + item)
        return Promise.resolve(nextResult())
      },
      command: (playerid, ...cmd) => {
        assert.equal(playerid, PLAYERID)
        actions.push(cmd.join(" "))
        return Promise.resolve(nextResult())
      },
    },
    loadPlayer: Promise.resolve,
  }, callback)
}

const PLAYERID = "1:1:1:1"
const DISPATCH = () => null
const STATE = {
  player: {isPlaying: true},
  playlist: null,
}
