import React from 'react'
import { Icon, Menu } from 'semantic-ui-react'

import * as players from './playerselect'
import './menu.styl'

export const MainMenuUI = props => (
  <div className="mainmenu">
    <PowerBar {...props} />
    <div className="ui padded grid">
      <div className="sixteen wide column">
        {props.children}
      </div>
    </div>
  </div>
)

const PowerBar = props => {
  function togglePlayerPower() {
    props.command(player.playerid, "power", player.isPowerOn ? 0 : 1)
  }
  const player = props.player.toObject()
  return (
    <Menu size="small" attached="top" borderless>
      <Menu.Item fitted>
        <players.SelectPlayer
          playerid={player.playerid}
          onPlayerSelected={props.onPlayerSelected}
          {...props.players.toObject()} />
      </Menu.Item>
      <Menu.Menu position="right">
        <Menu.Item
            fitted="vertically"
            active={player.isPowerOn}
            onClick={togglePlayerPower}
            disabled={!player.playerid}>
          <Icon name="power" size="large" />
        </Menu.Item>
      </Menu.Menu>
    </Menu>
  )
}
