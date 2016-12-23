import _ from 'lodash'
import { createStore, applyMiddleware, compose, combineReducers } from 'redux'
import DevTools from './devtools'

const enhancer = compose(
  // Middleware you want to use in development:
  applyMiddleware(),
  // TODO exclude from production build
  // Required! Enable Redux DevTools with the monitors you chose
  DevTools.instrument()
)

let allActions = {}

export default function makeActor(name) {
  if (typeof name !== 'string') {
    throw new Error("action name must be a string (got " + typeof name + ")")
  }
  if (allActions.hasOwnProperty(name)) {
    throw new Error("cannot create duplicate action: " + name)
  }

  function actionCreator(state, payload) {
    if (actionCreator.dispatch === null) {
      throw new Error("action '" + name + "' dispatch not connected")
    }
    actionCreator.dispatch({
      type: name,
      payload,
    })
  }

  actionCreator.dispatch = null
  //actionCreator._name = name
  allActions[name] = actionCreator
  return actionCreator
}

export function makeStore(reducer) {
  //const reducer = combineReducers(reducers)
  const store = createStore(reducer, {}, enhancer)
  _.each(allActions, action => {
    action.dispatch = store.dispatch
  })
  // disable adding more actions
  allActions = null
  return store
}
