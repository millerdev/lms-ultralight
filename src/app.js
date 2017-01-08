import { Map } from 'immutable'
import React from 'react'
import { connect, Provider } from 'react-redux'
import { combineReducers } from 'redux-immutable'
import 'semantic-ui-css/semantic.min.css'

import DevTools from './devtools'
import * as player from './player'
import * as players from './playerselect'
import { makeStore } from './store'

const defaultState = Map({
  players: players.defaultState,
  player: player.defaultState,
})

const reducer = combineReducers({
  players: players.reducer,
  player: player.reducer,
})

const store = makeStore(reducer, defaultState)

function stateMapper(key) {
  return state => {
    const obj = state.get(key).toObject()
    obj.playerid = state.get("player").get("playerid")
    return obj
  }
}

const SelectPlayer = connect(stateMapper("players"))(players.SelectPlayer)
const Player = connect(stateMapper("player"))(player.Player)

const App = () => (
  <Provider store={store}>
    <div>
      <SelectPlayer />
      <Player />
      <DevTools />
    </div>
  </Provider>
)

export default App

// TODO move to Player.componentDidMount
// also http://stackoverflow.com/a/38523610/10840
export const init = players.init
