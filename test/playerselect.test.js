import { fromJS, Map } from 'immutable'
import React from 'react'
import { shallow } from 'enzyme'

import * as mod from '../src/playerselect'

const players = [
  {playerid: "1:1:1:1", name: "One"},
  {playerid: "2:2:2:2", name: "Two"},
]

describe('playerselect', function () {
  describe('reducer', function () {
    describe('gotPlayers', function () {
      it('should add players to state', function () {
        const action = {
          type: "gotPlayers",
          payload: players,
        }
        const result = mod.reducer(Map(), action)
        assert.equal(result, fromJS({
          players,
          loading: false,
          error: false,
        }))
      })

      it('should set a flag on error', function () {
        const state = fromJS({
          players,
          loading: false,
          error: false,
        })
        const action = {
          type: "gotPlayers",
          payload: undefined,
        }
        const result = mod.reducer(state, action)
        assert.equal(result, state.set('error', true))
      })
    })
  })

  describe('<SelectPlayer />', function () {
    it('should transform players to options', function () {
      const dom = shallow(
        <mod.SelectPlayer
          players={fromJS(players)}
          />)
      const dropdown = dom.find("Dropdown")
      assert.deepEqual(dropdown.props().options, [
        {value: "1:1:1:1", text: "One"},
        {value: "2:2:2:2", text: "Two"},
      ])
      assert.equal(dropdown.props().error, undefined)
    })

    it('should set error flag on players error', function () {
      const dom = shallow(
        <mod.SelectPlayer
          players={fromJS(players)}
          error={true}
          />)
      const dropdown = dom.find("Dropdown")
      assert.equal(dropdown.props().options.length, 2)
      assert.equal(dropdown.props().error, true)
    })
  })
})
