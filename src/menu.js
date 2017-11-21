import _ from 'lodash'
import React from 'react'

import * as lms from './lmsclient'
import { MainMenuUI } from './menuui'
import * as player from './player'
import * as players from './playerselect'

export class MainMenu extends React.Component {
  constructor() {
    super()
    this.state = {sidebarOpen: false}
  }
  componentDidMount() {
    lms.getPlayers().then(data => {
      this.props.dispatch(players.gotPlayers(data))
      let playerid = localStorage.currentPlayer
      if (!playerid || !_.some(data, item => item.playerid === playerid)) {
        if (!data.length) {
          return
        }
        playerid = data[0].playerid
      }
      this.loadPlayer(playerid, true)
    })
    // TODO convey failure to view somehow
  }
  loadPlayer(...args) {
    player.loadPlayer(...args).then(action => this.props.dispatch(action))
  }
  onPlayerSelected(playerid) {
    localStorage.currentPlayer = playerid
    this.loadPlayer(playerid, true)
  }
  onToggleSidebar() {
    this.setState({sidebarOpen: !this.state.sidebarOpen})
  }
  command(playerid, ...args) {
    lms.command(playerid, ...args).then(() => { this.loadPlayer(playerid) })
    // TODO convey failure to view somehow
  }
  render() {
    const props = this.props
    return <MainMenuUI
        onPlayerSelected={this.onPlayerSelected.bind(this)}
        onToggleSidebar={this.onToggleSidebar.bind(this)}
        sidebarOpen={this.state.sidebarOpen}
        command={this.command.bind(this)}
        {...props}>
      {props.children}
    </MainMenuUI>
  }
}
