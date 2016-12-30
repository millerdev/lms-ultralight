import React from 'react'
import { Provider } from 'react-redux'
import { combineReducers } from 'redux-immutable'
import 'semantic-ui-css/semantic.min.css'

import DevTools from './devtools'
import Player, { reducer as playerReducer } from './player'
import { makeStore } from './store'

const reducer = combineReducers({
  playerState: playerReducer,
})

const store = makeStore(reducer)

const App = () => (
  <Provider store={store}>
    <div>
      <Player />
      <DevTools />
    </div>
  </Provider>
)

export default App
