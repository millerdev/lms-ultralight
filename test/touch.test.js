import { render, shallow } from 'enzyme'
import _ from 'lodash'
import React from 'react'

import { rewire } from './util'
import * as mod from '../src/touch'
import {__RewireAPI__ as module} from '../src/touch'

describe('TouchList', function () {
  function stateTest(name, act, startConfig, endConfig) {
    it(startConfig + " [" + name + "] -> " + endConfig, function () {
      const [state, selection, lastSelected] = makeState(startConfig)
      let newSelection = null
      const touchlist = shallow(
        <mod.TouchList
          items={state.items}
          selection={selection}
          onSelectionChanged={sel => { newSelection = sel }}
        />,
        {disableLifecycleMethods: true},
      ).instance()
      touchlist.setState(state)
      touchlist.lastSelected = lastSelected
      act(touchlist)
      assert.deepEqual(makeConfig(touchlist, newSelection), endConfig)
      const [endState, endSelection, endLastSelected] = makeState(endConfig)
      assert.deepEqual(touchlist.state, endState)
      assert.deepEqual(newSelection, endSelection)
      assert.deepEqual(touchlist.lastSelected, endLastSelected)
    })
  }

  describe("onItemSelected", function () {
    function test(startConfig, ix, endConfig, modifier) {
      const act = touchlist => touchlist.onItemSelected(ix, modifier)
      stateTest("sel " + ix, act, startConfig, endConfig)
    }

    test("ab(c)defg", 1, "aB(c)defg | b")
    test("ab(c)defg", 3, "ab(c)Defg | d")
    test("aB(c)defg | b", 3, "ab(c)Defg | d")
    test("aB(c)defg | b", 3, "aB(c)Defg | bd", mod.SINGLE)
    test("aB(c)defg | b", 1, "ab(c)defg", mod.SINGLE)
    test("aB(c)defg | b", 3, "aB(C)Defg | bd", mod.TO_LAST)
  })

  describe("clearSelection", function () {
    function test(startConfig, endConfig) {
      const act = touchlist => touchlist.clearSelection()
      stateTest("clear", act, startConfig, endConfig)
    }

    test("aB(c)defg | b", "ab(c)defg")
    test("ab(C)defg | c", "ab(c)defg")
    test("aB(C)Defg | bd", "ab(c)defg")
  })
})

/**
 * Make playlist state, selection, and lastSelected for given configuration
 *
 * Configuration syntax:
 * - items are letters (abcd...)
 * - capitalized letters are selected items
 * - letter in (parens) is current track
 * - letters after " | " are lastSelected items
 */
function makeState(config) {
  const index = c => indexMap[c.toLowerCase()]
  const match = /^((?:[a-z]|\([a-z]\))+)(?: \| ([a-z]*))?$/i.exec(config)
  const playchars = match[1].split("").filter(c => /[a-z]/i.test(c))
  const indexMap = _.fromPairs(playchars.map((c, i) => [c.toLowerCase(), i]))
  const currentChar = /\(([a-z])\)/i.exec(config) || {1: playchars[0]}
  const current = index(currentChar[1])
  const items = playchars.map((c, i) => ({
    "index": i,
    "title": c.toLowerCase(),
  }))
  return [
    // state
    {
      dropIndex: -1,
      dropTypes: {},
      items: items,
      currentIndex: current,
    },
    // selection
    new Set(playchars.filter(c => /[A-Z]/.test(c)).map(index)),
    // lastSelected
    (match[2] || "").split("").map(index),
  ]
}

function makeConfig(touchlist, selection) {
  const state = touchlist.state
  const lastSelected = touchlist.lastSelected
  const current = state.currentIndex
  const playchars = state.items.map(item => {
    const i = item.index
    const t = item.title
    const c = i === current ? "(" + t + ")" : t
    return selection.has(i) ? c.toUpperCase() : c
  }).join("")
  const last = lastSelected.map(i => state.items[i].title).join("")
  return playchars + (last ? " | " + last : "")
}

describe("LoadingList", function () {
  it("with no props should not have spacers", function () {
    renderWithHeight(undefined, {}, list => {
      assert.equal(list.length, 1)
    })
  })

  it("with items but not before/after should not have spacers", function () {
    renderWithHeight(10, {items: [1, 2]}, list => {
      assert.equal(list.length, 1)
    })
  })

  it("with items and before should have space above", function () {
    renderWithHeight(10, {items: [1, 2], itemsOffset: 1}, list => {
      assert.equal(list.length, 2)
      assert.equal(list.first().attr("style"), 'height:5px')
    })
  })

  it("with items and after should have space below", function () {
    renderWithHeight(12, {items: [1, 2], itemsTotal: 3}, list => {
      assert.equal(list.length, 2)
      assert.equal(list.last().attr("style"), 'height:6px')
    })
  })

  it("with before and after should have space above and below", function () {
    const props = {items: [1, 2], itemsOffset: 1, itemsTotal: 6}
    renderWithHeight(8, props, list => {
      assert.equal(list.length, 3)
      assert.equal(list.first().attr("style"), 'height:4px')
      assert.equal(list.last().attr("style"), 'height:12px')
    })
  })

  it("with empty client should not have spacers", function () {
    const props = {items: [1, 2], itemsOffset: 1, itemsTotal: 6}
    renderWithHeight(undefined, props, list => {
      assert.equal(list.length, 1)
    })
  })

  it("with height and zero items should not render spacers", function () {
    const props = {items: [], itemsOffset: 1, itemsTotal: 6}
    renderWithHeight(3, props, list => {
      assert.equal(list.length, 1)
    })
  })

  function renderWithHeight(height, props, check) {
    let asserted = false
    rewire(module, {
      useResizeDetector: () => ({height}),
    }, () => {
      check(render(<mod.LoadingList {...props} />))
      asserted = true
    })
    assert(asserted, 'rewire assertions not run')
  }

  describe("updateLoadingContext", function () {
    describe("ranges", () => {
      function test(before, count, after=0, expect="") {
        const cfg = JSON.stringify([before, count, after])
        it(`for ${cfg} should be '${expect}'`, function () {
          const total = before + count + after
          const cx = {}
          mod.updateLoadingContext(cx, before, count, total)
          const actual = _.map(
            cx.ranges,
            (item, key) => `${key}:${item[0]}-${item[1]}`
          ).join(",")
          assert.equal(actual, expect)
        })
      }

      test(0, 2, 0)
      test(2, 2, 0, "2:2-0")
      test(0, 2, 2, "1:2-4")
      test(5, 2, 5, "5:5-0,6:7-12")
      test(5, 3, 5, "5:5-0,7:8-13")
      test(0, 100, 0)
      test(2, 100, 0, "2:2-0,11:2-0")
      test(0, 100, 140, "90:100-240,99:100-240")
      test(3, 100, 7, "3:3-0,12:3-0,93:103-110,102:103-110")
    })

    describe("loadItems", function () {
      it("should load small range at beginning", function () {
        assert.deepEqual(loadItems([9, 0]), [0, 9])
      })

      it("should load at most 100 items at beginning", function () {
        assert.deepEqual(loadItems([150, 0]), [50, 100])
      })

      it("should load small range at end", function () {
        assert.deepEqual(loadItems([50, 56]), [50, 6])
      })

      it("should load at most 100 items at end", function () {
        assert.deepEqual(loadItems([6, 199]), [6, 100])
      })

      function loadItems(rng) {
        function onLoad(range) {
          result = range
        }
        let result = "onLoad not called"
        const cx = {}
        mod.updateLoadingContext(cx, 0, 0, 0, onLoad)
        cx.loadItems(rng)
        return result
      }
    })
  })
})
