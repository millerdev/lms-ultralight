import { Map } from 'immutable'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'

import { combine, effect, split, IGNORE_ACTION } from './effects'
import { MainMenuUI } from './menuui'
import { playerControl, loadPlayer } from './playctl'
import * as players from './playerselect'
import * as search from './search'
import makeReducer from './store'
import { operationError, timer } from './util'

export const defaultState = Map({
  messages: Map(),
  players: players.defaultState,
  search: search.defaultState,
})

const messagesReducer = makeReducer({
  operationError: (state, action, message, context, showFor /* seconds */) => {
    window.console.log(message, context)  // HACK side effect
    return combine(
      state.set("error", message),
      [effect(hideOperationErrorAfter, showFor)],
    )
  },
  hideOperationError: state => {
    return state.remove("error")
  },
})

export const actions = messagesReducer.actions

export function reducer(state=defaultState, action) {
  const [msgState, msgEffects] =
    split(messagesReducer(state.get("messages"), action))
  const [searchState, searchEffects] =
    split(search.reducer(state.get("search"), action))
  return combine(Map({
    messages: msgState,
    players: players.reducer(state.get("players"), action),
    search: searchState,
  }), searchEffects.concat(msgEffects))
}

export const hideOperationErrorAfter = (() => {
  const time = timer()
  return wait => {
    time.clear(IGNORE_ACTION)
    return time.after(wait * 1000, actions.hideOperationError)
  }
})()


export class MainMenu extends React.Component {
  constructor() {
    super()
    this.keydownHandlers = {}
  }
  componentDidMount() {
    document.addEventListener("keydown", event => this.onKeyDown(event))
    players.loadPlayers(this.props.dispatch).then(data => {
      let playerid = localStorage.currentPlayer
      if (!playerid || !_.some(data, item => item.playerid === playerid)) {
        if (!data.length) {
          return
        }
        playerid = data[0].playerid
      }
      loadPlayer(playerid, true).then(this.props.dispatch)
    }).catch(err =>
      this.props.dispatch(operationError("Cannot load players", err))
    )
  }
  getChildContext() {
    return {
      addKeydownHandler: this.addKeydownHandler.bind(this),
    }
  }
  addKeydownHandler(code, handler) {
    this.keydownHandlers[code] = handler
  }
  onKeyDown(event) {
    if (
      this.keydownHandlers.hasOwnProperty(event.keyCode) &&
      event.target.tagName.toLowerCase() !== "input"  // global events only
    ) {
      this.keydownHandlers[event.keyCode]()
    }
  }
  playctl() {
    return playerControl(
      this.props.player.get("playerid"),
      this.props.dispatch,
      {
        player: this.props.player,
        playlist: this.props.playlist,
      },
    )
  }
  onPlayerSelected(playerid) {
    localStorage.currentPlayer = playerid
    loadPlayer(playerid, true).then(this.props.dispatch)
  }
  onHideError() {
    this.props.dispatch(actions.hideOperationError())
  }
  render() {
    const {menu, children, ...props} = this.props
    return <MainMenuUI
        playctl={this.playctl()}
        players={menu.get("players")}
        search={menu.get("search")}
        messages={menu.get("messages").toObject()}
        onHideError={this.onHideError.bind(this)}
        onPlayerSelected={this.onPlayerSelected.bind(this)}
        {...props}>
      {children}
    </MainMenuUI>
  }
}

MainMenu.childContextTypes = {
  addKeydownHandler: PropTypes.func.isRequired,
}
