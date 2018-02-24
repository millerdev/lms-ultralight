import { shallow } from 'enzyme'
import _ from 'lodash'
import React from 'react'

import * as mod from '../src/touch'

describe('TouchList', function () {
  function stateTest(name, act, startConfig, endConfig) {
    it(startConfig + " [" + name + "] -> " + endConfig, function () {
      const touchlist = shallow(
        <mod.TouchList />,
        {disableLifecycleMethods: true},
      ).instance()
      touchlist.setState(makeState(startConfig))
      act(touchlist)
      assert.deepEqual(makeConfig(touchlist.state), endConfig)
      assert.deepEqual(touchlist.state, makeState(endConfig))
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
 * Make playlist state for given configuration
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
  return {
    dropIndex: -1,
    dropTypes: {},
    items: items,
    selection: new Set(playchars.filter(c => /[A-Z]/.test(c)).map(index)),
    lastSelected: (match[2] || "").split("").map(index),
    currentIndex: current,
  }
}

function makeConfig(state) {
  const selection = state.selection
  const current = state.currentIndex
  const playchars = state.items.map(item => {
    const i = item.index
    const t = item.title
    const c = i === current ? "(" + t + ")" : t
    return selection.has(i) ? c.toUpperCase() : c
  }).join("")
  const last = state.lastSelected.map(i => state.items[i].title).join("")
  return playchars + (last ? " | " + last : "")
}
