import _ from 'lodash'
import React from 'react'

import { combine, effect, split, IGNORE_ACTION } from './effects'
import { MenuContext } from './menucontext'
import { MainMenuUI } from './menuui'
import { playerControl } from './playctl'
import { loadPlayer } from './player'
import * as players from './playerselect'
import * as library from './library'
import makeReducer from './store'
import { memoize, operationError, timer } from './util'

export const defaultState = {
  messages: {error: null},
  players: players.defaultState,
  library: library.defaultState,
}

const messagesReducer = makeReducer({
  operationError: (state, action, message, context, showFor /* seconds */) => {
    window.console.log(message, context)  // HACK side effect
    return combine(
      {...state, error: message},
      [effect(hideOperationErrorAfter, showFor)],
    )
  },
  hideOperationError: state => {
    return {...state, error: null}
  },
})

export const actions = messagesReducer.actions

export function reducer(state=defaultState, action) {
  const [msgState, msgEffects] =
    split(messagesReducer(state.messages, action))
  const [libraryState, libraryEffects] =
    split(library.reducer(state.library, action))
  return combine({
    messages: msgState,
    players: players.reducer(state.players, action),
    library: libraryState,
  }, libraryEffects.concat(msgEffects))
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
    const mini = JSON.parse(localStorage.getItem("menu.miniPlayer"))
    this.state = {miniPlayer: mini === undefined ? true : mini}
    this.keydownHandlers = {}
    this.didShow = createEventForwarder()
  }
  getTitle() {
    const tags = this.props.playlist.currentTrack || {}
    return _.filter([tags.title, tags.artist, "Ultralight"]).join(" - ")
  }
  componentDidMount() {
    document.title = this.getTitle()
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
      this.props.dispatch(operationError("Cannot load players", err)),
    )
  }
  addKeydownHandler = (code, handler) => {
    this.keydownHandlers[code] = handler
  }
  mediaNav = (item, nav) => (
    library.mediaNav(item, this.props.navigate, "/menu", nav)
  )
  onKeyDown(event) {
    if (
      _.has(this.keydownHandlers, event.keyCode) &&
      event.target.tagName.toLowerCase() !== "input"  // global events only
    ) {
      this.keydownHandlers[event.keyCode]()
    }
  }
  toggleMiniPlayer = () => {
    const value = !this.state.miniPlayer
    localStorage.setItem("menu.miniPlayer", value)
    this.setState({miniPlayer: value})
  }
  makePlayctl = memoize((playerid, isPowerOn, isPlaying, currentTrack) => {
    const state = {playerid, isPowerOn, isPlaying, currentTrack}
    return playerControl(this.props.dispatch, state)
  })
  playctl() {
    const { playerid, isPowerOn, isPlaying } = this.props.player
    const { currentTrack } = this.props.playlist
    return this.makePlayctl(playerid, isPowerOn, isPlaying, currentTrack)
  }
  onPlayerSelected = playerid => {
    localStorage.currentPlayer = playerid
    loadPlayer(playerid, true).then(this.props.dispatch)
  }
  componentDidUpdate() {
    document.title = this.getTitle()
  }
  onHideError = () => {
    this.props.dispatch(actions.hideOperationError())
  }
  render() {
    const {menu, children, ...props} = this.props
    const context = {
      addKeydownHandler: this.addKeydownHandler,
      mediaNav: this.mediaNav,
    }
    return (
      <MenuContext.Provider value={context}>
        <MainMenuUI
          {...props}
          playctl={this.playctl()}
          players={menu.players}
          library={menu.library}
          messages={menu.messages}
          onHideError={this.onHideError}
          onPlayerSelected={this.onPlayerSelected}
          mediaNav={this.mediaNav}
          miniPlayer={this.state.miniPlayer}
          toggleMiniPlayer={this.toggleMiniPlayer}
          menuDidShow={this.didShow}
        >
          {children}
        </MainMenuUI>
      </MenuContext.Provider>
    )
  }
}


function createEventForwarder() {
  const callbacks = []
  return {
    subscribe: (callback => callbacks.push(callback)),
    fire: (event => callbacks.forEach(cb => cb(event))),
  }
}
