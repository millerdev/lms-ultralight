import React from 'react'
import { connect, Provider } from 'react-redux'
import 'semantic-ui-css/semantic.min.css'

//import DevTools from './devtools'
import * as player from './player'
import { makeStore } from './store'

const store = makeStore(player.reducer, player.defaultState)

const Player = connect(state => state.toObject())(player.Player)

const App = () => (
  <Provider store={store}>
    <div>
      <Player />
      {/*<DevTools />*/}
    </div>
  </Provider>
)

export default App

// TODO move to Player.componentDidMount
// also http://stackoverflow.com/a/38523610/10840
export const init = player.init
