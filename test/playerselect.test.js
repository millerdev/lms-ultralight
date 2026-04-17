import React from 'react'
import { shallow } from 'enzyme'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

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
    it('should render a MenuItem for each player', function () {
      const dom = shallow(<mod.SelectPlayer players={PLAYERS} />)
      const items = dom.find(MenuItem)
      assert.equal(items.length, 2)
      assert.equal(items.at(0).prop('value'), "1:1:1:1")
      assert.equal(items.at(0).children().text(), "One")
      assert.equal(items.at(1).prop('value'), "2:2:2:2")
      assert.equal(items.at(1).children().text(), "Two")
    })

    it('should set error flag on players error', function () {
      const dom = shallow(
        <mod.SelectPlayer
          players={PLAYERS}
          error={true}
          />)
      assert.equal(dom.find(Select).prop('error'), true)
    })
  })
})
