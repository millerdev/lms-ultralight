import React from 'react'
import { Button } from 'semantic-ui-react'

import * as players from './playerselect'

export const MainMenuUI = props => (
  <div className="mainmenu">
    <PowerBar {...props} />
    {props.children}
  </div>
)

const PowerBar = props => {
  function togglePlayerPower() {
    props.command(player.playerid, "power", player.isPowerOn ? 0 : 1)
  }
  const player = props.player.toObject()
  return <div className="powerbar ui padded grid">
    <div className="twelve wide column">
      <players.SelectPlayer
        playerid={player.playerid}
        onPlayerSelected={props.onPlayerSelected}
        {...props.players.toObject()} />
    </div>
    <div className="right aligned four wide column">
      <Button.Group basic size="small">
        <Button basic toggle
          active={player.isPowerOn}
          onClick={togglePlayerPower}
          icon="power"
          disabled={!player.playerid} />
      </Button.Group>
    </div>
  </div>
}
