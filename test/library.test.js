import { shallow } from 'enzyme'
import _ from 'lodash'
import React from 'react'

import * as mod from '../src/library'

describe('library', function () {
  describe("BrowserItems component", function () {
    it('should handle querystring media queries', function () {
      const action = test("/menu?q=something")
      assert.deepEqual(action.type, "mediaSearch")
      assert.deepEqual(action.payload, {term: "something"})
    })

    describe("getActionFromLocation", () => {
      it("should clear results with no search term", () => {
        const action = test("/menu")
        assert.deepEqual(action.type, "clearMedia")
      })

      it("should do media browse with parameters", () => {
        const action = test("/menu/album/3?contributor=256")
        assert.deepEqual(action.type, "mediaLoad")
        assert.deepEqual(action.args, [
          {type: "album", id: "3"},
          {contributor: "256"},
          undefined,
        ])
      })

      it("should do media browse with parameters and search", () => {
        const action = test("/menu/album/3?contributor=256&q=moody")
        assert.deepEqual(action.type, "mediaLoad")
        assert.deepEqual(action.args, [
          {type: "album", id: "3"},
          {contributor: "256", term: "moody"},
          undefined,
        ])
      })
    })

    function test(path) {
      const qstart = path.indexOf("?") > 0 ? path.indexOf("?") : path.length
      const pathname = path.slice(0, qstart)
      const search = path.slice(qstart)
      const dispatch = makeDispatch()
      shallow(<mod.BrowserItems
        dispatch={dispatch}
        basePath="/menu"
        location={{pathname, search}}
      />)
      return dispatch.getAction()
    }
  })

  describe("mediaNav", function () {
    const basePath = "/menu"

    it("should add parameter to history", () => {
      const item = {type: "contributor", id: 24, title: "Cher"}
      const [ path, nav ] = getPathNav(item)
      assert.equal(path, "/menu/contributor/24")
      assert.deepEqual(nav, {
        name: "Cher",
        pathspec: {pathname: "/menu/contributor/24", search: ""},
        params: {'contributor': 24},
        previous: undefined,
      })
    })

    it("should merge parameter with previous parameters", () => {
      const previous = {params: {'contributor': 24}}
      const item = {type: "album", id: 3, title: "No Album"}
      const [ path, nav ] = getPathNav(item, previous)
      assert.equal(path, "/menu/album/3?contributor=24")
      assert.deepEqual(nav, {
        name: "No Album",
        pathspec: {pathname: "/menu/album/3", search: "?contributor=24"},
        params: {'album': 3, 'contributor': 24},
        previous,
      })
    })

    it("should not merge query term from previous search", () => {
      const previous = {
        name: "cher",
        term: "cher",
        pathspec: {pathname: "/menu", search: "?q=cher"},
      }
      const item = {type: "contributor", id: 24, title: "Cher"}
      const [ path, nav ] = getPathNav(item, previous)
      assert.equal(path, "/menu/contributor/24")
      assert.deepEqual(nav, {
        name: "Cher",
        pathspec: {pathname: "/menu/contributor/24", search: ""},
        params: {'contributor': 24},
        previous,
      })
    })

    it("should not merge previous folder", () => {
      const previous = {
        name: "Cher",
        pathspec: {pathname: "/menu/folder/230", search: ""},
        params: {folder: 230},
      }
      const item = {type: "folder", id: 231, title: "The Greatest Hits"}
      const [ path, nav ] = getPathNav(item, previous)
      assert.equal(path, "/menu/folder/231")
      assert.deepEqual(nav, {
        name: "The Greatest Hits",
        pathspec: {pathname: "/menu/folder/231", search: ""},
        params: {'folder': 231},
        previous,
      })
    })

    it("should not merge track parameters", () => {
      const previous = {params: {'contributor': 24, 'album': 3, track: 215}}
      const item = {type: "album", id: 3, title: "No Album"}
      const [ path, nav ] = getPathNav(item, previous)
      assert.equal(path, "/menu/album/3")
      assert.deepEqual(nav, {
        name: "No Album",
        pathspec: {pathname: "/menu/album/3", search: ""},
        params: {'album': 3},
        previous,
      })
    })

    it("should not merge folder with track", () => {
      const previous = {params: {'folder': 230}}
      const item = {type: "track", id: 5283, title: "Toad Winsome"}
      const [ path, nav ] = getPathNav(item, previous)
      assert.equal(path, "/menu/track/5283")
      assert.deepEqual(nav, {
        name: "Toad Winsome",
        pathspec: {pathname: "/menu/track/5283", search: ""},
        params: {'track': 5283},
        previous,
      })
    })

    function getPathNav(item, previous) {
      const location = {}
      const history = {push: (to, state) => _.assign(location, {to, state})}
      mod.mediaNav(item, history, basePath, previous).show()
      return [location.to, location.state.nav]
    }
  })

  describe("taggedParams", function () {
    it("should convert key to section param", () => {
      assert.deepEqual(
        mod.taggedParams({"genre": "Ambient"}),
        ["genre_id:Ambient"],
      )
    })

    it("should convert section param and search term", () => {
      assert.deepEqual(
        mod.taggedParams({genre: "Ambient", term: "Enya"}),
        ["genre_id:Ambient", "search:Enya"],
      )
    })

    _.forEach([
      "search",
      "compilation",
      "artist_id",
      "role_id",
      "library_id",
      "year",
    ], param => {
      it(`should convert {${param}: "value"} parameter`, () => {
        assert.deepEqual(
          mod.taggedParams({[param]: "value"}),
          [`${param}:value`],
        )
      })
    })

    it("should ignore unknown keys", () => {
      assert.deepEqual(mod.taggedParams({"foo": "bar"}), [])
    })
  })

  describe("getParams", function () {
    it("should pass through params with undefined item", () => {
      assert.deepEqual(
        mod.getParams(undefined, {"genre": "Ambient"}),
        {"genre": "Ambient"},
      )
    })

    it("should return undefined for undefined params", () => {
      assert.equal(mod.getParams({}, undefined), undefined)
    })
  })

  describe("mergeLoops", function () {
    it("should merge contiguous results", function () {
      const res1 = makeResult(2, 0, 4)
      const res2 = makeResult(2, 2, 4)
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        [{loop: [0, 1, 2, 3].map(i => ({index: i})), count: 4}],
      )
    })

    it("should merge new result into no result", function () {
      const res1 = []
      const res2 = makeResult(2)
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        [{loop: [0, 1].map(i => ({index: i})), count: 2}],
      )
    })

    it("should not merge new result into no result", function () {
      const res1 = makeResult(2)
      const res2 = []
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        [],
      )
    })

    it("should not merge results with different counts", function () {
      const res1 = makeResult(2)
      const res2 = makeResult(1, 2)
      assert.deepEqual(
        mod.mergeLoops(res1, res2),
        res2,
      )
    })

    function makeResult(len, offset=0, count=len + offset) {
      return [{
        loop: Array.from(Array(len).keys()).map(i => ({index: i + offset})),
        count,
      }]
    }
  })
})

function makeDispatch() {
  const actions = []
  const dispatch = action => {
    actions.push(action)
  }
  dispatch.getAction = () => {
    assert.equal(actions.length, 1, "actions: " + JSON.stringify(actions))
    return actions[0]
  }
  return dispatch
}
