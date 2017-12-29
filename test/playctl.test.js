import { promiseChecker, rewire } from './util'

import * as mod from '../src/playctl'
import {__RewireAPI__ as module} from '../src/playctl'

describe('playctl', function () {
  describe("playerControl", function () {

    it('should play multiple tracks', function () {
      const playctl = mod.playerControl(PLAYERID, DISPATCH, STATE)
      const items = ["item-2", "item-4", "item-6"]
      const promise = promiseChecker()
      promise
        .then(callback => callback(true))
        .then(callback => callback(true))
        .done()
      let index = 0
      rewire(module, {
        lms: {playlistControl: (playerid, cmd, item, dispatch) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(cmd, index === 0 ? "load" : "add", "index = " + index)
          assert.deepEqual(item, items[index])
          assert.equal(dispatch, DISPATCH)
          index += 1
          return promise
        }},
      }, () => {
        playctl.playItems(items)
      })
      assert.equal(index, 3)
      promise.check()
    })

    it('should add multiple tracks to playlist', function () {
      const playctl = mod.playerControl(PLAYERID, DISPATCH, STATE)
      const items = ["item-2", "item-5"]
      const promise = promiseChecker()
      promise
        .then(callback => callback(true))
        .then(callback => callback(true))
        .done()
      let index = 0
      rewire(module, {
        resolved: () => promise,
        lms: {playlistControl: (playerid, cmd, item, dispatch) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(cmd, "add")
          assert.deepEqual(item, items[index])
          assert.equal(dispatch, DISPATCH)
          index += 1
          return promise
        }},
      }, () => {
        playctl.addToPlaylist(items)
      })
      assert.equal(index, 2)
      promise.check()
    })
  })
})

const PLAYERID = "1:1:1:1"
const DISPATCH = () => null
const STATE = {
  player: null,
  playlist: null,
}
