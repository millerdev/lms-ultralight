import { Map } from 'immutable'
import _ from 'lodash'
import { createStore, applyMiddleware, compose } from 'redux'
import DevTools from './devtools'

const enhancer = compose(
  // Middleware you want to use in development:
  applyMiddleware(),
  // TODO exclude from production build
  // Required! Enable Redux DevTools with the monitors you chose
  DevTools.instrument()
)

let allActions = {}

export function makeActor(name) {
  if (typeof name !== 'string') {
    throw new Error("action name must be a string (got " + typeof name + ")")
  }
  if (allActions === null) {
    throw new Error("cannot create action '" + name + "' after makeStore")
  }
  if (allActions.hasOwnProperty(name)) {
    throw new Error("cannot create duplicate action: " + name)
  }
  function actor(payload) {
    if (actor.dispatch === null) {
      throw new Error("action '" + name + "' dispatch not connected")
    }
    actor.dispatch({
      type: name,
      payload,
    })
  }
  actor.dispatch = null
  actor.key = name
  allActions[name] = actor
  return actor
}

export default function makeReducer(actionsToReducers, defaultState) {
  function reducer(state=defaultState, action) {
    if (reducers.hasOwnProperty(action.type)) {
      return reducers[action.type](state, action)
    }
    return state
  }
  reducer.defaultState = defaultState
  const actions = reducer.actions = {}
  const reducers = {}
  _.each(actionsToReducers, (reduce, action) => {
    if (action.startsWith("ref:")) {
      action = {key: action.slice(4)}
    } else {
      action = makeActor(action)
      actions[action.key] = action
    }
    if (reducers.hasOwnProperty(action.key)) {
      throw new Error("duplicate reducer action: " + action.key)
    }
    reducers[action.key] = reduce
  })
  return reducer
}

export function makeStore(reducer, initialState=reducer.defaultState || Map()) {
  const store = createStore(reducer, initialState, enhancer)
  _.each(allActions, action => {
    action.dispatch = store.dispatch
  })
  // disable adding more actions
  allActions = null
  return store
}
