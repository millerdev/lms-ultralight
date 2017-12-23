import { shallow } from 'enzyme'
import { fromJS, Set } from 'immutable'
import React from 'react'

import { promiseChecker, rewire } from './util'

import * as mod from '../src/search'
import {__RewireAPI__ as module} from '../src/search'

describe('search', function () {
  describe("SearchResults component", function () {

    it('add multiple tracks to playlist', function () {
      const search = shallow(
        <mod.SearchResults {...PROPS.toObject()} />
      ).instance()
      const items = search.state.items.toJS()
      const promise = promiseChecker()
      promise
        .then(callback => callback(true))
        .then(callback => callback(true))
        .done()
      search.onSelectionChanged(Set([2, 5]))
      assert.equal(search.state.selection.size, 2)
      assert.equal(items[2].album, "Faded - Single")
      let index = 2
      rewire(module, {
        resolved: () => promise,
        lms: {playlistControl: (playerid, cmd, item, dispatch) => {
          assert.equal(playerid, PLAYERID)
          assert.equal(cmd, "add")
          assert.deepEqual(item, items[index])
          assert.equal(dispatch, PROPS.get("dispatch"))
          index += 3
          return promise
        }},
      }, () => {
        search.addToPlaylist(items[2])
      })
      assert.equal(index, 8)
      promise.check()
    })
  })
})

const PLAYERID = "1:1:1:1"

const RESULTS = fromJS({
  "count": 14,
  "contributors_count": 2,
  "albums_count": 3,
  "tracks_count": 4,
  "contributors_loop": [
    {
      "contributor": "Alan Walker",
      "contributor_id": 4095
    },
    {
      "contributor": "The Walker Brothers",
      "contributor_id": 5866
    }
  ],
  "albums_loop": [
    {
      "album": "Faded - Single",
      "album_id": 5684,
      "artwork": "a9ef0408"
    },
    {
      "album_id": 5685,
      "artwork": "04fd5b61",
      "album": "Sing Me to Sleep - Single"
    },
    {
      "album": "The Sea Of Dreams",
      "album_id": 5936,
      "artwork": "057f207f"
    }
  ],
  "tracks_loop": [
    {
      "audio": "1",
      "track_id": 28661,
      "track": "Midnight Walker",
      "coverid": "057f207f"
    },
    {
      "track": "Faded",
      "track_id": 27025,
      "coverid": "a9ef0408",
      "audio": "1"
    },
    {
      "audio": "1",
      "track": "Sing Me to Sleep",
      "track_id": 27026,
      "coverid": "04fd5b61"
    },
    {
      "coverid": "",
      "track": "Make It Easy On Yourself",
      "track_id": 36773,
      "audio": "1"
    }
  ]
})

const PROPS = mod.defaultState.merge({
  playerid: PLAYERID,
  results: RESULTS,
  dispatch: () => {},
})
