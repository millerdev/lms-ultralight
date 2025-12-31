import React from 'react'
import { BrowserRouter as Router, useNavigate } from 'react-router-dom'
import { connect, Provider } from 'react-redux'
import 'semantic-ui-css/semantic.min.css'

//import DevTools from './devtools'
import './app.styl'
import { combine, split } from './effects'
import * as menu from './menu'
import * as player from './player'
import * as playlist from './playlist'
import { makeStore } from './store'

const defaultState = {
  menu: menu.defaultState,
  player: player.defaultState,
  playlist: playlist.defaultState,
}

function reducer(state=defaultState, action) {
  const [menuState, menuEffects] =
    split(menu.reducer(state.menu, action))
  const [playerState, playerEffects] =
    split(player.reducer(state.player, action))
  const [playlistState, playlistEffects] =
    split(playlist.reducer(state.playlist, action))
  return combine({
    menu: menuState,
    player: playerState,
    playlist: playlistState,
  }, menuEffects.concat(playerEffects).concat(playlistEffects))
}

function withNavigate(Component) {
  return function WithNavigate(props) {
    return <Component {...props} navigate={useNavigate()} />
  }
}

const store = makeStore(reducer, defaultState)
const MainMenu = withNavigate(connect(state => state)(menu.MainMenu))

const ultralight = /\/ultralight(\/?|$)/.test(window.location.pathname)
const basename = ultralight ? "/ultralight" : "/"

const App = () => (
  <Provider store={store}>
    <Router basename={basename}>
      <MainMenu>
        {/* <DevTools /> */}
      </MainMenu>
    </Router>
  </Provider>
)

export default App
