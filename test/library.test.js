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
