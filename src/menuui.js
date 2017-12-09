import React from 'react'
import { Icon, Menu, Message, Sidebar, Transition } from 'semantic-ui-react'

import * as players from './playerselect'
import { MediaSearch } from './search'
import './menu.styl'

export const MainMenuUI = props => (
  <div className="mainmenu">
    <Sidebar
        as="div"
        className="sidebarContainer"
        animation="push"
        width="wide"
        visible={props.sidebarOpen}>
      <Menu borderless>
        <Menu.Item onClick={props.onToggleSidebar}>
          <Icon name="angle left" size="big" />
        </Menu.Item>
        <PlayGroup
          position="right"
          command={props.command}
          playerid={props.player.get("playerid")}
          isPlaying={props.player.get("isPlaying")} />
      </Menu>
      <Menu borderless fluid vertical>
        <Menu.Item name="search">
          <MediaSearch {...props} />
        </Menu.Item>
      </Menu>
    </Sidebar>
    <Sidebar.Pusher>
      <PowerBar {...props} />
      <Transition
          visible={!!props.messages.error}
          animation="slide down"
          duration={500}
          unmountOnHide>
        <Message
            className="messages"
            onDismiss={props.onHideError}
            onClick={props.onHideError}
            size="small"
            negative>
          <Message.Content>
            <Icon name="warning" size="large" />
            {props.messages.error}
          </Message.Content>
        </Message>
      </Transition>
      <div className="mainview ui grid">
        <div className="sixteen wide column">
          {props.children}
        </div>
      </div>
    </Sidebar.Pusher>
  </div>
)

const PowerBar = props => {
  function togglePlayerPower() {
    props.command(player.playerid, "power", player.isPowerOn ? 0 : 1)
  }
  const player = props.player.toObject()
  return (
    <Menu
        attached={props.sidebarOpen && "top"}
        fixed={!props.sidebarOpen ? "top" : null}
        borderless>
      <Menu.Item onClick={props.onToggleSidebar}>
        <Icon name="content" size="large" />
      </Menu.Item>
      {player.isControlVisible ?
        <Menu.Item fitted>
          <players.SelectPlayer
            playerid={player.playerid}
            onPlayerSelected={props.onPlayerSelected}
            dispatch={props.dispatch}
            {...props.players.toObject()} />
        </Menu.Item> :
        <PlayGroup
          command={props.command}
          playerid={player.playerid}
          isPlaying={player.isPlaying} />
      }
      {player.isControlVisible ?
        <Menu.Menu position="right">
          <Menu.Item
              fitted="vertically"
              active={player.isPowerOn}
              onClick={togglePlayerPower}
              disabled={!player.playerid}>
            <Icon name="power" size="large" />
          </Menu.Item>
        </Menu.Menu> :
        <VolumeGroup command={props.command} playerid={player.playerid} />
      }
    </Menu>
  )
}

const PlayGroup = props => {
  const playerid = props.playerid
  return <Menu.Menu position={props.position} icon>
    <Menu.Item
        onClick={() => props.command(playerid, "playlist", "index", "-1")}
        disabled={!playerid}
        fitted>
      <Icon size="large" name="backward" />
    </Menu.Item>
    <Menu.Item
        onClick={() => props.command(playerid, props.isPlaying ? "pause" : "play")}
        disabled={!playerid}
        fitted="vertically">
      <Icon size="large" name={props.isPlaying ? "pause" : "play"} />
    </Menu.Item>
    <Menu.Item
        onClick={() => props.command(playerid, "playlist", "index", "+1")}
        disabled={!playerid}
        fitted>
      <Icon size="large" name="forward" />
    </Menu.Item>
  </Menu.Menu>
}

const VolumeGroup = props => {
  const playerid = props.playerid
  return <Menu.Menu position="right" icon>
    <Menu.Item
        onClick={() => props.command(playerid, "mixer", "volume", "-5")}
        disabled={!playerid}
        fitted="vertically">
      <Icon size="large" name="volume down" />
    </Menu.Item>
    <Menu.Item
        onClick={() => props.command(playerid, "mixer", "volume", "+5")}
        disabled={!playerid}
        fitted="vertically">
      <Icon size="large" name="volume up" />
    </Menu.Item>
  </Menu.Menu>
}
