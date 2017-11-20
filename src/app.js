import { Map } from 'immutable'
import React from 'react'
import { connect, Provider } from 'react-redux'
//import 'semantic-ui-css/semantic.min.css'

//import DevTools from './devtools'
import './semantic.css'
import { combine, split } from './effects'
import * as menu from './menu'
import * as player from './player'
import * as players from './playerselect'
import { makeStore } from './store'

const defaultState = Map({
  players: players.defaultState,
  player: player.defaultState,
})

function reducer(state=defaultState, action) {
  const [playerState, effects] =
    split(player.reducer(state.get("player"), action))
  return combine(Map({
    players: players.reducer(state.get("players"), action),
    player: playerState,
  }), effects)
}

const store = makeStore(reducer, defaultState)
const MainMenu = connect(state => state.toObject())(menu.MainMenu)
const Player = connect(state => state.get("player").toObject())(player.Player)

const App = () => (
  <Provider store={store}>
    <MainMenu>
      <div className="ui padded grid">
        <div className="sixteen wide column">
          <Player />
          {/* <DevTools /> */}
        </div>
      </div>
    </MainMenu>
  </Provider>
)

export default App
