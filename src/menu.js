import { Map } from 'immutable'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'

import { combine, effect, split, IGNORE_ACTION } from './effects'
import * as lms from './lmsclient'
import { MainMenuUI } from './menuui'
import * as player from './player'
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
    this.state = {sidebarOpen: false}
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
      this.loadPlayer(playerid, true)
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
    if (this.keydownHandlers.hasOwnProperty(event.keyCode)) {
      this.keydownHandlers[event.keyCode]()
    }
  }
  loadPlayer(...args) {
    return player.loadPlayer(...args).then(this.props.dispatch)
  }
  setSearchInput(input) {
    this.searchInput = input
  }
  onPlayerSelected(playerid) {
    localStorage.currentPlayer = playerid
    this.loadPlayer(playerid, true)
  }
  onToggleSidebar() {
    const open = !this.state.sidebarOpen
    this.setState({sidebarOpen: open}, () => {
      if (open) {
        this.searchInput.focus()
        this.searchInput.inputRef.select()
      }
    })
  }
  command(playerid, ...args) {
    lms.command(playerid, ...args)
      .catch(err =>
        this.props.dispatch(operationError("Command error", {args, err})))
      .then(() => this.loadPlayer(playerid))
  }
  render() {
    const props = this.props
    return <MainMenuUI
        setSearchInput={this.setSearchInput.bind(this)}
        onPlayerSelected={this.onPlayerSelected.bind(this)}
        onToggleSidebar={this.onToggleSidebar.bind(this)}
        sidebarOpen={this.state.sidebarOpen}
        command={this.command.bind(this)}
        players={props.menu.get("players")}
        search={props.menu.get("search")}
        playerid={props.player.get("playerid")}
        messages={props.menu.get("messages").toObject()}
        {...props}>
      {props.children}
    </MainMenuUI>
  }
}

MainMenu.childContextTypes = {
  addKeydownHandler: PropTypes.func.isRequired,
}
