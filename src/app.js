import { Map } from 'immutable'
import React from 'react'
import { connect, Provider } from 'react-redux'
//import 'semantic-ui-css/semantic.min.css'

//import DevTools from './devtools'
import './semantic.css'
import { combine, split } from './effects'
import * as menu from './menu'
import * as player from './player'
import * as playlist from './playlist'
import { makeStore } from './store'

const defaultState = Map({
  menu: menu.defaultState,
  player: player.defaultState,
  playlist: playlist.defaultState,
})

function reducer(state=defaultState, action) {
  const [menuState, menuEffects] =
    split(menu.reducer(state.get("menu"), action))
  const [playerState, playerEffects] =
    split(player.reducer(state.get("player"), action))
  const [playlistState, playlistEffects] =
    split(playlist.reducer(state.get("playlist"), action))
  return combine(Map({
    menu: menuState,
    player: playerState,
    playlist: playlistState,
  }), menuEffects.concat(playerEffects).concat(playlistEffects))
}

const store = makeStore(reducer, defaultState)
const MainMenu = connect(state => state.toObject())(menu.MainMenu)
const Player = connect(state => {
  const state_ = state.get("player").toObject()
  state_.currentTrack = state.getIn(["playlist", "currentTrack"])
  return state_
})(player.Player)
const Playlist = connect(
  state => state.get("playlist").toObject()
)(playlist.Playlist)

const App = () => (
  <Provider store={store}>
    <MainMenu>
      <Player />
      <Playlist />
      {/* <DevTools /> */}
    </MainMenu>
  </Provider>
)

export default App
