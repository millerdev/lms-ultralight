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
    <div className="ui padded grid">
      <div className="sixteen wide column">
        <Player store={store} dispatch={store.dispatch} />
        {/* <DevTools /> */}
      </div>
    </div>
  </Provider>
)

export default App
