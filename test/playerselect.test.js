import { render, fireEvent, screen } from '@testing-library/react'
import React from 'react'

import { rewire } from './util'

import * as mod from '../src/playerselect'
import {__RewireAPI__ as module} from '../src/playerselect'

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
      const { container } = render(
        <mod.SelectPlayer players={PLAYERS} dispatch={() => {}} />,
      )
      rewire(module, {maybeLoadPlayers: () => {}}, () => {
        fireEvent.mouseDown(container.querySelector('.MuiSelect-select'))
      })
      const options = screen.getAllByRole('option')
      assert.equal(options.length, 2)
      assert.equal(options[0].getAttribute('data-value'), "1:1:1:1")
      assert.equal(options[0].textContent, "One")
      assert.equal(options[1].getAttribute('data-value'), "2:2:2:2")
      assert.equal(options[1].textContent, "Two")
    })

    it('should set error flag on players error', function () {
      const { container } = render(
        <mod.SelectPlayer players={PLAYERS} error={true} />,
      )
      assert(container.querySelector('.Mui-error'), 'expected Mui-error class')
    })
  })
})
