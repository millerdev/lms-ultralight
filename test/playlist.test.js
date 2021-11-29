import { shallow } from 'enzyme'
import _ from 'lodash'
import React from 'react'

import { promiseChecker, rewire } from './util'

import { effect, getEffects, getState, split } from '../src/effects'
import * as mod from '../src/playlist'
import {__RewireAPI__ as module} from '../src/playlist'
import { MEDIA_ITEMS } from '../src/library'
import { operationError } from '../src/util'

describe('playlist', function () {
  describe('reducer', function () {
    const reduce = mod.reducer
    describe('gotPlayer', function () {
      const gotPlayer = reduce.actions.gotPlayer

      it('should set current track and playlist metadata', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer(STATUS)))
        assert.deepEqual(state, STATE)
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
        assert.deepEqual(state, {...mod.defaultState, playerid: PLAYERID})
      })

      it('should clear selection on playerid change', function () {
        const data = {...STATUS, playerid: PLAYERID + "1"}
        const state = {...STATE, selection: new Set([1])}
        const result = getState(reduce(state, gotPlayer(data)))
        assert.deepEqual(result, {...state,
          playerid: PLAYERID + "1",
          selection: new Set(),
        })
      })

      it('should update playlist with playlist query', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_1,
        })))
        assert.deepEqual(state, {...STATE, items: PLAYLIST_1})
      })

      it('should update playlist', function () {
        const state = getState(reduce(mod.defaultState, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_1,
        })))
        assert.deepEqual(state, {...STATE, items: PLAYLIST_1})
      })

      it('should not change track info with playlist before current track', function () {
        const state = getState(reduce(STATE, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_0,
        })))
        assert.deepEqual(state, {...STATE, items: PLAYLIST_0})
      })

      it('should not change track info with playlist after current track', function () {
        const state = getState(reduce(STATE, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
        })))
        assert.deepEqual(state, {...STATE, items: PLAYLIST_2})
      })

      it('should not fetch playlist on playlist update and playlist not changed', function () {
        const effects = getEffects(reduce(STATE, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
        })))
        assert.deepEqual(effects, [])
      })

      it('should fetch playlist on playlist changed and not playlist update', function () {
        const effects = getEffects(reduce(STATE, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: false,
          playlist_tracks: 300,
        })))
        assert.deepEqual(effects, [effect(
          mod.loadPlayer,
          PLAYERID,
          true,
        )])
      })

      it('should fetch playlist on playlist changed and update after current track', function () {
        const effects = getEffects(reduce(STATE, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
          playlist_tracks: 300,
        })))
        assert.deepEqual(effects, [effect(
          mod.loadPlayer,
          PLAYERID,
          true,
        )])
      })

      it('should add items to end of playlist', function () {
        const state = {...STATE, items: PLAYLIST_1}
        const result = getState(reduce(state, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_2,
        })))
        assert.deepEqual(result, {
          ...STATE,
          currentIndex: 2,
          items: PLAYLIST_1.concat(PLAYLIST_2),
        })
      })

      it('should merge items with same index into playlist', function () {
        const state = {...STATE, items: PLAYLIST_1}
        const result = getState(reduce(state, gotPlayer({
          ...STATUS,
          isPlaylistUpdate: true,
          playlist_loop: PLAYLIST_OVERLAP,
        })))
        assert.deepEqual(result, {
          ...STATE,
          currentIndex: 2,
          items: PLAYLIST_1.slice(0, -1).concat(PLAYLIST_OVERLAP),
        })
      })
    })

    describe('advanceToNextTrack', function () {
      const advanceToNextTrack = reduce.actions.advanceToNextTrack
      it('should load player status when next is unknown', function () {
        const state1 = {
          ...STATE,
          currentIndex: 3,
          items: PLAYLIST_1.slice(2),
        }
        const [state2, effects] =
          split(reduce(state1, advanceToNextTrack(PLAYERID)))
        assert.equal(state1, state2)
        assert.deepEqual(effects, [
          effect(
            mod.loadPlayer,
            PLAYERID,
            true,
          ),
        ])
      })
    })

    function stripLastSelected(config) {
      return config.replace(/ \| .*/, "")
    }

    function reducerTest(name, action, startConfig, endConfig) {
      it(startConfig + " [" + name + "] -> " + endConfig, function () {
        const state = makeState(startConfig)
        const [result, effects] = split(getState(reduce(state, action)))
        assert.equal(
          stripLastSelected(makeConfig(result)),
          stripLastSelected(endConfig)
        )
        assert.deepEqual(result, makeState(endConfig))
        assert.equal(result.currentTrack["playlist index"],
                     result.currentIndex)
        assert.deepEqual(effects, [])
      })
    }

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

  describe('moveItem', function () {
    it("should handle loop starting with non-zero playlist index", () => {
      const result = mod.moveItem(PLAYLIST_1, 2, 3)
      assert.deepEqual(result.map(x => x[mod.IX]), [1, 2, 3])
      assert.equal(result[1].title, "song 3")
      assert.notDeepEqual(PLAYLIST_1, result)
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
      return mod.moveItems(new Set([1]), 0, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(1, 0),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move single item up', function () {
      const foo = setup()
      return mod.moveItems(new Set([0]), 2, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(0, 2),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should not move single item to own index', function () {
      const foo = setup()
      return mod.moveItems(new Set([1]), 1, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [])
        assert(!moved, "should not have any moves")
      })
    })

    it('should not move single item to next index', function () {
      const foo = setup()
      return mod.moveItems(new Set([1]), 2, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [])
        assert(!moved, "should not have any moves")
      })
    })

    it('should not move selected items up to next', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3]), 4, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [])
        assert(!moved, "should not have any moves")
      })
    })

    it('should move unselected item above selection', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3]), 1, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(1, 4),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move unselected item below selection', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3]), 5, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) selected items down', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3]), 0, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(2, 0),
          actions.playlistItemMoved(3, 1),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) selected items up', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3]), 6, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(3, 6),
          actions.playlistItemMoved(2, 5),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) unselected items below (3) selected', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3, 5]), 7, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
          actions.playlistItemMoved(6, 3),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (2) unselected items down and up', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3, 6, 7]), 5, ...foo.args).then(moved => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(4, 2),
          actions.playlistItemMoved(5, 8),
        ])
        assert(moved, "should signal move")
      })
    })

    it('should move (1) unselected item down and (2) selected items down', function () {
      const foo = setup()
      return mod.moveItems(new Set([2, 3, 8, 9]), 5, ...foo.args).then(moved => {
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
      return mod.moveItems(new Set([2, 3, 8, 9]), 7, ...foo.args).then(moved => {
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
      return mod.moveItems(new Set([0, 1, 3, 9]), 3, ...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(2, 0),
          actions.playlistItemMoved(9, 4),
        ])
      })
    })

    it('should move selected items down and up (with unmoved indices)', function () {
      const foo = setup()
      return mod.moveItems(new Set([0, 1, 3, 4, 9]), 3, ...foo.args).then(() => {
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
      return mod.moveItems(new Set([0, 1]), 6, ...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemMoved(1, 6),
          operationError("Move error"),
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
          state.playerid,
          state.selection,
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
      const foo = setup({...STATE, items: PLAYLIST_1})
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [])
      })
    })

    it('should delete selected item', function () {
      const foo = setup({
        ...STATE,
        items: PLAYLIST_1,
        selection: new Set([1]),
      })
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(1),
        ])
      })
    })

    it('should delete multiple selected items', function () {
      const foo = setup({
        ...STATE,
        items: PLAYLIST_1,
        selection: new Set([3, 1]),
      })
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(3),
          actions.playlistItemDeleted(1),
        ])
      })
    })

    it('should delete multiple selected items in reverse order', function () {
      const foo = setup({
        ...STATE,
        items: PLAYLIST_1,
        selection: new Set([2, 1, 3]),
      })
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(3),
          actions.playlistItemDeleted(2),
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
      const foo = setup({
        ...STATE,
        items: PLAYLIST_1,
        selection: new Set([1, 3]),
      }, lms)
      return mod.deleteSelection(...foo.args).then(() => {
        assert.deepEqual(foo.dispatched, [
          actions.playlistItemDeleted(3),
          operationError("Delete error"),
        ])
      })
    })
  })

  describe("mergePlaylist", function () {
    it("should merge identical lists", function () {
      const result = mod.mergePlaylist(PLAYLIST_1, PLAYLIST_1)
      assert.deepEqual(result, PLAYLIST_1)
    })

    it("should discard non-contiguous old items before new items", function () {
      const result = mod.mergePlaylist(PLAYLIST_2, PLAYLIST_0)
      assert.equal(result, PLAYLIST_2)  // note identity equality (===)
    })

    it("should discard non-contiguous old items after new items", function () {
      const result = mod.mergePlaylist(PLAYLIST_0, PLAYLIST_2)
      assert.equal(result, PLAYLIST_0)  // note identity equality (===)
    })

    it("should merge [1] into [1,2,3]", function () {
      const one = {...PLAYLIST_1[0], title: "new title"}
      const result = mod.mergePlaylist([one], PLAYLIST_1)
      assert.deepEqual(result, [one, PLAYLIST_1[1], PLAYLIST_1[2]])
    })

    it("should merge [1,2,3] into [1]", function () {
      const one = {...PLAYLIST_1[0], title: "old title"}
      const result = mod.mergePlaylist(PLAYLIST_1, [one])
      assert.deepEqual(result, PLAYLIST_1)
    })

    it("should merge [1,2,3] into [2]", function () {
      const two = {...PLAYLIST_1[1], title: "old title"}
      const result = mod.mergePlaylist(PLAYLIST_1, [two])
      assert.deepEqual(result, PLAYLIST_1)
    })

    it("should merge [1,2,3] into [3,4,5]", function () {
      const result = mod.mergePlaylist(PLAYLIST_1, PLAYLIST_OVERLAP)
      assert.deepEqual(result, PLAYLIST_1.concat(PLAYLIST_OVERLAP.slice(1)))
    })

    it("should merge [1,2,3] into [4,5,6]", function () {
      const result = mod.mergePlaylist(PLAYLIST_1, PLAYLIST_2)
      assert.deepEqual(result, PLAYLIST_1.concat(PLAYLIST_2))
    })

    it("should merge [2] into [1,2,3]", function () {
      const two = {...PLAYLIST_1[1], title: "new title"}
      const result = mod.mergePlaylist([two], PLAYLIST_1)
      assert.deepEqual(result, [PLAYLIST_1[0], two, PLAYLIST_1[2]])
    })

    it("should merge [3,4,5] into [1,2,3]", function () {
      const result = mod.mergePlaylist(PLAYLIST_OVERLAP, PLAYLIST_1)
      assert.deepEqual(result, PLAYLIST_1.slice(0, -1).concat(PLAYLIST_OVERLAP))
    })

    it("should merge [4,5,6] into [1,2,3]", function () {
      const result = mod.mergePlaylist(PLAYLIST_2, PLAYLIST_1)
      assert.deepEqual(result, PLAYLIST_1.concat(PLAYLIST_2))
    })
  })

  describe("Playlist component", function () {
    const opts = {context: {addKeydownHandler: () => {}}}

    it('should setup empty selection state', function () {
      const state = makeState("abcdef")
      const dom = shallow(<mod.Playlist {...state} />, opts)
      assert.deepEqual(dom.find("TouchList").props().selection, new Set())
    })

    it('should map selection to touchlist indexes', function () {
      const state = makeState("abCdEf", 10)
      assert.deepEqual(state.selection, new Set([12, 14]))
      const dom = shallow(<mod.Playlist {...state} />, opts)
      assert.deepEqual(dom.find("TouchList").props().selection, new Set([2, 4]))
    })

    it(`should not fetch playlist on play track at index`, () => {
      const state = makeState("abcdef", 100, 200)
      state.dispatch = {}
      const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
      const promise = promiseChecker()
      rewire(module, {
        lms: {command: (playerid, ...args) => {
          assert.equal(playerid, PLAYERID)
          assert.deepEqual(args, ["playlist", "index", 103])
          return promise
            .then(() => {/* ignore clear selection */})
            .then(loadPlayer => loadPlayer())
            .catch(() => {/* ignore error */})
            .then(callback => { assert.equal(callback, state.dispatch) })
            .done()
        }},
        loadPlayer: (playerid, fetchRange) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(fetchRange, undefined)
        },
      }, () => {
        playlist.playTrackAtIndex(103)
      })
      promise.check()
    })

    it('should convert selection indexes on delete', function () {
      const state = makeState("abCdEf", 10)
      state.dispatch = {}
      const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
      assert.equal(playlist.props.selection.size, 2)

      const promise = promiseChecker()
      rewire(module, {
        deleteSelection: (playerid, selection) => {
          assert.equal(playerid, PLAYERID)
          assert.deepEqual(selection, [12, 14])  // verify selection
          return promise
            .then(loadPlayer => loadPlayer())
            .catch(() => {/* ignore */})
            .then(callback => assert.equal(callback, state.dispatch))
            .done()
        },
        loadPlayer: (playerid, fetchRange) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(fetchRange, undefined)
        },
      }, () => {
        playlist.deleteItems()
      })
      promise.check()
    })

    it('should clear playlist on delete with no selection', function () {
      const state = makeState("abcdef", 10)
      state.dispatch = {}
      const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
      assert.equal(playlist.props.selection.size, 0)

      const promise = promiseChecker()
      rewire(module, {
        lms: {command: (playerid, ...args) => {
          assert.equal(playerid, PLAYERID)
          assert.deepEqual(args, ["playlist", "clear"])
          return promise
            .then(loadPlayer => loadPlayer())
            .catch(() => {/* ignore */})
            .then(callback => { assert.equal(callback, state.dispatch) })
            .done()
        }},
        loadPlayer: (playerid, fetchRange) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(fetchRange, undefined)
        },
      }, () => {
        playlist.deleteItems()
      })
      promise.check()
    })

    it('should convert selection indexes on change selection', function () {
      const state = makeState("abCdef", 10)
      let dispatched = false
      state.dispatch = action => {
        assert.equal(action.type, "selectionChanged")
        assert.deepEqual(action.args, [new Set([12, 14, 15])])
        dispatched = true
      }
      const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
      assert.equal(playlist.props.selection.size, 1)
      playlist.onSelectionChanged(new Set([2, 4, 5]), false)
      assert(dispatched, "dispatch not called")
    })

    it('should move item after last item in playlist', function () {
      const state = makeState("abcdef", 10)
      state.dispatch = {}
      const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
      const promise = promiseChecker()
      rewire(module, {
        moveItems: (selection, index, playerid, dispatch) => {
          assert.deepEqual(selection, new Set([11]))
          assert.equal(index, 16)
          assert.equal(playerid, PLAYERID)
          assert.equal(dispatch, state.dispatch)
          return promise
            .then(loadPlayer => loadPlayer())
            .catch(() => {/* ignore */})
            .then(callback => { assert.equal(callback, state.dispatch) })
            .done()
        },
        loadPlayer: (playerid, fetchRange) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(fetchRange, undefined)
        },
      }, () => {
        playlist.onMoveItems(new Set([1]), 6)
      })
      promise.check()
    })

    it('should drop items after last item in playlist', function () {
      const state = makeState("abcdef", 10)
      state.dispatch = {}
      const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
      const items = [{}]
      let asserted = false
      rewire(module, {
        insertPlaylistItems: (playerid, data, index, dispatch, numTracks) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(data, items)
          assert.equal(index, 16)
          assert.equal(dispatch, state.dispatch)
          assert.equal(numTracks, 15)
          asserted = true
        },
      }, () => {
        playlist.onDrop(items, MEDIA_ITEMS, 6)
      })
      assert(asserted, 'rewire assertions not run')
    })

    describe("load items", function () {
      it("should dispatch load", function () {
        const state = makeState("abcdef", 10)
        state.dispatch = {}
        const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
        playlist.shouldAutoLoad = true
        const promise = promiseChecker()
        rewire(module, {
          loadPlayer: (playerid, indexRange) => {
            assert.equal(playerid, PLAYERID)
            assert.deepEqual(indexRange, [0, 9])
            return promise
              .then(dx => assert.equal(dx, state.dispatch))
              .then(unloading => unloading())
              .done()
          },
        }, () => {
          playlist.onLoadItems([0, 9])
        })
        promise.check()
        assert.deepEqual(Array.from(playlist.loading), [])
      })

      it("should load at most 100 items at beginning", function () {
        const state = makeState("abcdef", 151)
        const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
        playlist.shouldAutoLoad = true
        rewire(module, {
          loadPlayer: (playerid, indexRange) => {
            assert.deepEqual(indexRange, [50, 100])
            return fakePromise
          },
        }, () => {
          playlist.onLoadItems([50, 100])
        })
        assert(playlist.loading.has('[50,100]'), 'not loading')
      })

      it("should load at most 100 items at end", function () {
        const state = makeState("abcdef", 0, 200)
        const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
        playlist.shouldAutoLoad = true
        rewire(module, {
          loadPlayer: (playerid, indexRange) => {
            assert.deepEqual(indexRange, [6, 100])
            return fakePromise
          },
        }, () => {
          playlist.onLoadItems([6, 100])
        })
        assert(playlist.loading.has('[6,100]'), 'not loading')
      })

      it("should dedup loads", function () {
        const state = makeState("abcdef", 201, 500)
        const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
        playlist.shouldAutoLoad = true
        const loads = []
        rewire(module, {
          loadPlayer: (playerid, indexRange) => {
            loads.push(indexRange)
            return fakePromise
          },
        }, () => {
          playlist.onLoadItems([207, 100])
          playlist.onLoadItems([100, 100])
          playlist.onLoadItems([207, 100])
          playlist.onLoadItems([100, 100])
        })
        assert.deepEqual(loads, [
          [207, 100],
          [100, 100],
        ])
      })

      it("should ignore undefined range", function () {
        const state = makeState("abcdef", 151)
        const playlist = shallow(<mod.Playlist {...state} />, opts).instance()
        const loads = []
        rewire(module, {
          loadPlayer: (playerid, indexRange) => {
            loads.push(indexRange)
            return fakePromise
          },
        }, () => {
          playlist.onLoadItems()
        })
        assert.equal(loads.length, 0)
      })

      const fakePromise = {then: () => fakePromise}
    })
  })
})

/**
 * Make playlist state for given configuration
 *
 * Configuration syntax:
 * - playlist items are letters (abcd...)
 * - capitalized letters are selected items
 * - letter in (parens) is current track, defaults to first track
 * - letters after " | " are lastSelected items
 */
function makeState(config, firstIndex=0, numTracks) {
  const index = c => indexMap[c.toLowerCase()]
  const match = /^((?:[a-z]|\([a-z]\))+)(?: \| ([a-z]*))?$/i.exec(config)
  const playchars = match ? _.filter(match[1].split(""), c => /[a-z]/i.test(c)) : []
  const indexMap = _.fromPairs(
    playchars.map((c, i) => [c.toLowerCase(), i + firstIndex])
  )
  const currentChar = /\(([a-z])\)/i.exec(config) || {1: playchars[0]}
  const current = index(currentChar[1])
  const items = _.map(playchars, c => ({
    "url": "file:///" + c.toLowerCase(),
    "playlist index": index(c),
    "title": c.toLowerCase(),
  }))
  return {
    ...STATE,
    items: items,
    selection: new Set(
      _(playchars)
      .filter(c => /[A-Z]/.test(c))
      .map(index)
      .value()
    ),
    currentIndex: current,
    currentTrack: items[current],
    numTracks: _.max([numTracks || 0, firstIndex + playchars.length - 1]),
  }
}

function makeConfig(state) {
  const selection = state.selection
  const current = state.currentIndex
  const playchars = _.map(state.items, item => {
    const i = item["playlist index"]
    const t = item.title
    const c = i === current ? "(" + t + ")" : t
    return selection.has(i) ? c.toUpperCase() : c
  }).join("")
  const last = "ignored"
  return playchars + (last ? " | " + last : "")
}

const PLAYERID = "1:1:1:1"

const STATUS = {
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
      "id": 30349,
    },
  ],
  "playlist_timestamp": 1482495558.93241,
  "playlist_tracks": 7,
  "power": 0,
  "rate": 1,
  "seq_no": 0,
  "signalstrength": 81,
  "time": 232.467967245102,
}

const PLAYLIST_0 = [
  {
    "url": "file:///...",
    "playlist index": 0,
    "title": "song 0",
    "id": 1000,
  },
]

const PLAYLIST_1 = [
  {
    "url": "file:///...",
    "playlist index": 1,
    "title": "song 1",
    "id": 1001,
  }, {
    "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
    "playlist index": 2,
    "title": "Metallic Rain",
    "id": 30349,
  }, {
    "url": "file:///...",
    "playlist index": 3,
    "title": "song 3",
    "id": 1003,
  },
]


const PLAYLIST_OVERLAP = [
  {
    "url": "file:///...",
    "playlist index": 3,
    "title": "song 4 overlapped",
    "id": 1004,
  }, {
    "url": "file:///...",
    "playlist index": 4,
    "title": "song 5 overlapped",
    "id": 1005,
  }, {
    "url": "file:///...",
    "playlist index": 5,
    "title": "song 6 overlapped",
    "id": 1006,
  },
]

const PLAYLIST_2 = [
  {
    "url": "file:///...",
    "playlist index": 4,
    "title": "song 4",
    "id": 1004,
  }, {
    "url": "file:///...",
    "playlist index": 5,
    "title": "song 5",
    "id": 1005,
  }, {
    "url": "file:///...",
    "playlist index": 6,
    "title": "song 6",
    "id": 1006,
  },
]

const STATE = {
  ...mod.defaultState,
  playerid: PLAYERID,
  timestamp: 1482495558.93241,
  numTracks: 7,
  currentIndex: 2,
  currentTrack: {
    "id": 30349,
    "title": "Metallic Rain",
    "playlist index": 2,
    "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
  },
  items: STATUS.playlist_loop,
}
