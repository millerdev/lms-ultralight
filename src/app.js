import { Map } from 'immutable'
import React from 'react'
import { connect, Provider } from 'react-redux'
//import 'semantic-ui-css/semantic.min.css'

//import DevTools from './devtools'
import './semantic.css'
import { combine, split } from './effects'
import * as menu from './menu'
import * as player from './player'
import { makeStore } from './store'

const defaultState = Map({
  menu: menu.defaultState,
  player: player.defaultState,
})

function reducer(state=defaultState, action) {
  const [menuState, menuEffects] =
    split(menu.reducer(state.get("menu"), action))
  const [playerState, playerEffects] =
    split(player.reducer(state.get("player"), action))
  return combine(Map({
    menu: menuState,
    player: playerState,
  }), menuEffects.concat(playerEffects))
}

const store = makeStore(reducer, defaultState)
const MainMenu = connect(state => state.toObject())(menu.MainMenu)
const Player = connect(state => state.get("player").toObject())(player.Player)

const App = () => (
  <Provider store={store}>
    <MainMenu>
      <Player />
      {/* <DevTools /> */}
    </MainMenu>
  </Provider>
)

export default App
