/**
 * A light-weight effects library inspired by redux-loop. It does not use
 * `Promise.all` to combine batches of effect results, which is critical because
 * some effects produce time-sensitive actions that must be dispatched as soon
 * as possible upon promise fullfillment.
 *
 * It also provides a way to cancel a promised action without causing a
 * subsequent dispatch.
 */
import _ from 'lodash'

let debug = true
export function setDebugMode(enabled) {
  debug = enabled
}


export function installEffects() {
  return next => (reducer, initialStateAndEffects, enhancer) => {
    const [initialState, initialEffects] = split(initialStateAndEffects)
    let currentEffects = []

    const effectsReducer = reducer => (stateAndEffects, action) => {
      const [state, effects] = split(reducer(stateAndEffects, action))
      if (has(effects)) {
        currentEffects = currentEffects.concat(effects)
      }
      return state
    }

    const store = next(effectsReducer(reducer), initialState, enhancer)

    function runEffect(parentActionType, effect) {
      Promise.resolve(effect.factory(...effect.args))
        .then(action => {
          if (debug) {
            window.console.log(parentActionType, action)
          }
          if (action !== IGNORE_ACTION) {
            dispatch(action)
          }
        })
        .catch(error => {
          window.console.error("'" + parentActionType +
            "' produced rejected effect: " + error.message)
          throw error
        })
    }

    function dispatch(action) {
      store.dispatch(action)
      const effectsToRun = currentEffects
      currentEffects = []
      _.each(effectsToRun, effect => runEffect(action.type, effect))
    }

    function replaceReducer(reducer) {
      return store.replaceReducer(effectsReducer(reducer))
    }

    if (has(initialEffects)) {
      const initialAction = {type: '@@Effects/INIT'}
      _.each(initialEffects, effect => runEffect(initialAction, effect))
    }

    return _.extend({}, store, {dispatch, replaceReducer})
  }
}

// Return IGNORE_ACTION from an effect factory to skip `store.dispatch()`
export const IGNORE_ACTION = {type: "IGNORE_ACTION"}

export function isEffected(obj) {
  return obj && obj[effectedSymbol]
}

export function split(state) {
  return isEffected(state) ? state : [state, []]
}

export function combine(state, effects) {
  const obj = [state, effects || []]
  obj[effectedSymbol] = true
  return obj
}

export function getState(stateAndEffects) {
  return split(stateAndEffects)[0]
}

export function getEffects(stateAndEffects) {
  return split(stateAndEffects)[1]
}

export function effect(factory, ...args) {
  return {factory, args}
}

function has(effects) {
  validate(effects)
  return effects && effects.length
}

function validate(effects) {
  if (effects !== undefined && !_.isArray(effects)) {
    throw new Error("bad effects array: " + effects)
  }
}

const effectedSymbol = Symbol('effected')
