import { fromJS, List, Map, Seq, Set } from 'immutable'

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
        const state = STATE.merge({
          selection:  Set([1]),
          lastSelected: List([1])
        })
        const result = getState(reduce(state, gotPlayer(data)))
        assert.equal(result, state.merge({
          playerid: PLAYERID + "1",
          selection: Set(),
          lastSelected: List(),
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

    function reducerTest(name, action, startConfig, endConfig) {
      it(startConfig + " [" + name + "] -> " + endConfig, function () {
        const state = makeState(startConfig)
        const [result, effects] = split(getState(reduce(state, action)))
        assert.equal(makeConfig(result), endConfig)
        assert.equal(result, makeState(endConfig))
        assert.equal(result.getIn(["currentTrack", "playlist index"]),
                     result.get("currentIndex"))
        assert.deepEqual(effects, [])
      })
    }

    describe("playlistItemSelected", function () {
      function test(startConfig, ix, endConfig, modifier) {
        const action = reduce.actions.playlistItemSelected(ix, modifier)
        reducerTest("sel " + ix, action, startConfig, endConfig)
      }

      test("ab(c)defg", 1, "aB(c)defg | b")
      test("ab(c)defg", 3, "ab(c)Defg | d")
      test("aB(c)defg | b", 3, "ab(c)Defg | d")
      test("aB(c)defg | b", 3, "aB(c)Defg | bd", mod.SINGLE)
      test("aB(c)defg | b", 1, "ab(c)defg", mod.SINGLE)
      test("aB(c)defg | b", 3, "aB(C)Defg | bd", mod.TO_LAST)
    })

    describe("clearPlaylistSelection", function () {
      const clear = reduce.actions.clearPlaylistSelection

      function test(startConfig, endConfig) {
        reducerTest("clear", clear(), startConfig, endConfig)
      }

      test("aB(c)defg | b", "ab(c)defg")
      test("ab(C)defg | c", "ab(c)defg")
      test("aB(C)Defg | bd", "ab(c)defg")
    })

    describe("playlistItemMoved", function () {
      function test(startConfig, fromIndex, toIndex, endConfig) {
        const action = reduce.actions.playlistItemMoved(fromIndex, toIndex)
        reducerTest(fromIndex + "->" + toIndex, action, startConfig, endConfig)
      }

      test("aB(C)defg | bc", 0, 3, "b(c)adefg")
      test("aBCde(f)g | bc", 0, 3, "bcade(f)g")
      test("ab(C)Defg | cd", 0, 4, "b(C)Daefg | cd")
      test("aB(C)defg | bc", 2, 4, "aBd(c)efg | b")
      test("aB(C)Defg | bcd", 0, 3, "b(c)aDefg | d") // probably never happen

      test("aB(c)DeFg | bdf", 0, 6, "b(c)DeFag | df")
      test("b(c)DeFag | df", 1, 6, "bdeFa(c)g | f")
      test("bdeFa(c)g | f", 2, 6, "bdfa(c)eg")

      test("aB(C)defg | bc", 1, 0, "ba(C)defg | c")
      test("aB(C)defg | bc", 3, 1, "adb(c)efg")
      test("aB(C)defg | bc", 4, 1, "aeB(C)dfg | bc")
      test("aB(C)dEFg | bcef", 6, 3, "aB(C)gdef | bc") // probably never happen
      test("aB(C)DEFg | bcdef", 6, 3, "aB(C)gdef | bc") // probably never happen

      test("aB(c)DeFg | bdf", 6, 1, "agB(c)Def | bd")
      test("agB(c)Def | bd", 5, 2, "ageB(c)df | b")
      test("ageB(c)df | b", 4, 3, "age(c)bdf")
    })

    describe("playlistItemDeleted", function () {
      const del = reduce.actions.playlistItemDeleted

      function test(startConfig, ix, endConfig) {
        reducerTest("rm " + ix, del(ix), startConfig, endConfig)
      }

      test("aB(c)Defg | bd", 1, "a(c)Defg | d")
      //test("aB(c)Defg | bd", 2, "a(B)Defg | bd")
      test("aB(c)Defg | bd", 3, "aB(c)efg | b")
      test("aB(c)Defg | bd", 7, "aB(c)Defg | bd") // index out of bounds
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

  describe('moveItems', function () {
    function setup(altLMS) {
      const dispatched = []
      const dispatch = action => dispatched.push(action)
      return {
        args: [PLAYERID, dispatch, altLMS || lms],
        dispatched,
      }
    }
    const lms = {command: (...args) => {
      assert.deepEqual([PLAYERID, "playlist", "move"], args.slice(0, 3),
        "lms.command args")
      return Promise.resolve()
    }}
    const actions = mod.reducer.actions

    it('should move single item down', function () {
      const foo = setup()
      return mod.moveItems(Set([1]), 0, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(1, 0),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move single item up', function () {
      const foo = setup()
      return mod.moveItems(Set([0]), 2, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(0, 2),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should not move single item to own index', function () {
      const foo = setup()
      return mod.moveItems(Set([1]), 1, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [])
        assert(!moved, "should not have any moves")
      })
    })

    it('should not move single item to next index', function () {
      const foo = setup()
      return mod.moveItems(Set([1]), 2, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [])
        assert(!moved, "should not have any moves")
      })
    })

    it('should not move selected items up to next', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3]), 4, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [])
        assert(!moved, "should not have any moves")
      })
    })

    it('should move unselected item above selection', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3]), 1, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(1, 4),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move unselected item below selection', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3]), 5, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) selected items down', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3]), 0, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(2, 0),
          actions.playlistItemMoved(3, 1),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) selected items up', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3]), 6, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(3, 6),
          actions.playlistItemMoved(2, 5),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) unselected items below (3) selected', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3, 5]), 7, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
          actions.playlistItemMoved(6, 3),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) unselected items down and up', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3, 6, 7]), 5, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
          actions.playlistItemMoved(5, 8),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (1) unselected item down and (2) selected items down', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3, 8, 9]), 5, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
          actions.playlistItemMoved(8, 5),
          actions.playlistItemMoved(9, 6),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) selected items up and (1) unselected item down', function () {
      const foo = setup()
      return mod.moveItems(Set([2, 3, 8, 9]), 7, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(3, 7),
          actions.playlistItemMoved(2, 6),
          actions.playlistItemMoved(7, 10),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move selected items down and up (with unmoved index)', function () {
      const foo = setup()
      return mod.moveItems(Set([0, 1, 3, 9]), 3, ...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(2, 0),
          actions.playlistItemMoved(9, 4),
        ])
      })
    })

    it('should move selected items down and up (with unmoved indices)', function () {
      const foo = setup()
      return mod.moveItems(Set([0, 1, 3, 4, 9]), 3, ...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(2, 0),
          actions.playlistItemMoved(9, 5),
        ])
      })
    })

    it('should abort move on lms failure', function () {
      const lms = {command: (...args) => {
        assert.deepEqual([PLAYERID, "playlist", "move"], args.slice(0, 3),
          "lms.command args")
        return args[3] === 1 ? Promise.resolve() : Promise.reject()
      }}
      const foo = setup(lms)
      return mod.moveItems(Set([0, 1]), 6, ...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(1, 6),
        ])
      })
    })
  })

  describe('deleteSelection', function () {
    function setup(state, altLMS) {
      const dispatched = []
      const dispatch = action => dispatched.push(action)
      return {
        args: [
          state.get("playerid"),
          state.get("selection"),
          dispatch,
          altLMS || lms,
        ],
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
      const foo = setup(STATE.set("items", PLAYLIST_1))
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [])
      })
    })

    it('should delete selected item', function () {
      const foo = setup(STATE.merge({
        items: PLAYLIST_1,
        selection: Set([1]),
        lastSelected: List([1]),
      }))
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(1)
        ])
      })
    })

    it('should delete multiple selected items', function () {
      const foo = setup(STATE.merge({
        items: PLAYLIST_1,
        selection: Set([3, 1]),
        lastSelected: List([1, 3]),
      }))
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(3),
          actions.playlistItemDeleted(1),
        ])
      })
    })

    it('should abort deletion on lms failure', function () {
      const lms = {command: (...args) => {
        assert.deepEqual([PLAYERID, "playlist", "delete"], args.slice(0, 3),
          "lms.command args")
        return args[3] === 3 ? Promise.resolve() : Promise.reject()
      }}
      const foo = setup(STATE.merge({
        items: PLAYLIST_1,
        selection: Set([3, 1]),
        lastSelected: List([1, 3]),
      }), lms)
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(3),
        ])
      })
    })
  })
})

/**
 * Make playlist state for given configuration
 *
 * Configuration syntax:
 * - playlist items are letters (abcd...)
 * - capitalized letters are selected items
 * - letter in (parens) is current track
 * - letters after " | " are lastSelected items
 */
function makeState(config) {
  const index = c => indexMap.get(c.toLowerCase())
  const match = /^((?:[a-z]|\([a-z]\))+)(?: \| ([a-z]*))?$/i.exec(config)
  const playchars = Seq(match[1])
    .filter(c => /[a-z]/i.test(c)).cacheResult()
  const indexMap = playchars
    .map(c => c.toLowerCase()).toKeyedSeq().flip().toMap()
  const current = index(/\(([a-z])\)/i.exec(config)[1])
  const items = playchars.map((c, i) => (Map({
    "url": "file:///" + c.toLowerCase(),
    "playlist index": i,
    "title": c.toLowerCase(),
  }))).toList()
  const data = {
    items: items,
    selection: playchars.filter(c => /[A-Z]/.test(c)).map(index).toSet(),
    lastSelected: Seq(match[2]).map(index).toList(),
    currentIndex: current,
    currentTrack: items.get(current),
    numTracks: playchars.size,
  }
  return STATE.merge(data)
}

function makeConfig(state) {
  const selection = state.get("selection")
  const current = state.get("currentIndex")
  const playchars = state.get("items").map(item => {
    const i = item.get("playlist index")
    const t = item.get("title")
    const c = i === current ? "(" + t + ")" : t
    return selection.has(i) ? c.toUpperCase() : c
  }).join("")
  const last = state.get("lastSelected").map(i =>
    state.getIn(["items", i, "title"])
  ).join("")
  return playchars + (last ? " | " + last : "")
}

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
