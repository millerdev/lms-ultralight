import { shallow } from 'enzyme'
import React from 'react'

import * as mod from '../src/library'

describe('library', function () {
  describe("BrowserItems component", function () {
    it('should handle querystring media queries', function () {
      const dispatch = makeDispatch()
      shallow(<mod.BrowserItems
        dispatch={dispatch}
        basePath="/test"
        location={{pathname: "/test", search: "?q=something&foo=bar"}}
      />)
      dispatch.check(action => {
        assert.deepEqual(action.type, "mediaSearch")
        assert.deepEqual(action.payload, {term: "something"})
      })
    })
  })

  describe("mergeLoops", function () {
    it("should merge contiguous results", function () {
      const res1 = makeResult(2)
      const res2 = makeResult(2, 2)
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        [{loop: [0, 1, 2, 3].map(i => ({index: i}))}],
      )
    })

    it("should merge new result into no result", function () {
      const res1 = []
      const res2 = makeResult(2)
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        [{loop: [0, 1].map(i => ({index: i}))}],
      )
    })

    it("should merge new result into no result", function () {
      const res1 = makeResult(2)
      const res2 = []
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        [],
      )
    })

    function makeResult(count, offset=0) {
      return [{loop: Array.from(Array(count).keys())
        .map(i => ({index: i + offset}))}]
    }
  })
})

function makeDispatch(n=1) {
  const actions = []
  const dispatch = action => {
    actions.push(action)
  }
  dispatch.check = (check) => {
    assert.equal(actions.length, n, "actions: " + JSON.stringify(actions))
    check(...actions)
  }
  return dispatch
}
