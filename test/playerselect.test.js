import React from 'react'
import { shallow } from 'enzyme'

import * as mod from '../src/playerselect'

const PLAYERS = [
  {playerid: "1:1:1:1", name: "One"},
  {playerid: "2:2:2:2", name: "Two"},
]

describe('playerselect', function () {
  const actions = mod.actions

  describe('reducer', function () {
    describe('gotPlayers', function () {
      it('should add players to state', function () {
        const action = actions.gotPlayers(PLAYERS)
        const result = mod.reducer({}, action)
        assert.deepEqual(result, {
          players: PLAYERS,
          loading: false,
          error: false,
        })
      })

      it('should set a flag on error', function () {
        const state = {
          players: PLAYERS,
          loading: false,
          error: false,
        }
        const action = actions.gotPlayers(undefined)
        const result = mod.reducer(state, action)
        assert.deepEqual(result, {...state, error: true})
      })
    })
  })

  describe('<SelectPlayer />', function () {
    it('should transform players to options', function () {
      const dom = shallow(<mod.SelectPlayer players={PLAYERS} />)
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
          players={PLAYERS}
          error={true}
          />)
      const dropdown = dom.find("Dropdown")
      assert.equal(dropdown.props().options.length, 2)
      assert.equal(dropdown.props().error, true)
    })
  })
})
