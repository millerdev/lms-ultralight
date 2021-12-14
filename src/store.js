import _ from 'lodash'
import { createStore, compose } from 'redux'

//import DevTools from './devtools'
import { installEffects } from './effects'

const enhancer = compose(
  installEffects(),
  // TODO exclude from production build
  // Required! Enable Redux DevTools with the monitors you chose
  //DevTools.instrument(),
)

let allActions = {}

export function makeActor(name) {
  if (typeof name !== 'string') {
    throw new Error("action name must be a string (got " + typeof name + ")")
  }
  if (allActions === null) {
    throw new Error("cannot create action '" + name + "' after makeStore")
  }
  if (_.has(allActions, name)) {
    throw new Error("cannot create duplicate action: " + name)
  }
  const actor = (...args) => ({
    type: name,
    payload: args[0],
    args: args,
  })
  actor.key = name
  allActions[name] = actor
  return actor
}

export default function makeReducer(actionsToReducers, defaultState) {
  function reducer(state=defaultState, action) {
    if (_.has(reducers, action.type)) {
      const args = _.has(action, "args") ? action.args : []
      return reducers[action.type](state, action, ...args)
    }
    return state
  }
  reducer.defaultState = defaultState
  const actions = reducer.actions = {}
  const reducers = {}
  _.each(actionsToReducers, (reduce, action) => {
    if (action.startsWith("ref:")) {
      const key = action.slice(4)
      if (!_.has(allActions, key)) {
        throw new Error("unknown action: " + action.key)
      }
      action = allActions[key]
    } else {
      action = makeActor(action)
    }
    actions[action.key] = action
    if (_.has(reducers, action.key)) {
      throw new Error("duplicate reducer action: " + action.key)
    }
    reducers[action.key] = reduce
  })
  return reducer
}

export function makeStore(reducer, initialState=reducer.defaultState || {}) {
  const store = createStore(reducer, initialState, enhancer)
  // disable adding more actions
  allActions = null
  return store
}
