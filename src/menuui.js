import React from 'react'
import { Icon, Menu, Message, Responsive, Sidebar, Transition } from 'semantic-ui-react'

import * as players from './playerselect'
import { MediaSearch } from './search'
import './menu.styl'

export const MainMenuUI = props => (
  <div className="mainmenu">
    <Responsive minWidth={500}>
      <Sidebar
          as="div"
          className="sidebar"
          animation="push"
          width="wide"
          visible={props.sidebarOpen}>
        <MenuItems {...props} />
      </Sidebar>
      <Sidebar.Pusher>
        <MainView {...props} />
      </Sidebar.Pusher>
    </Responsive>
    <Responsive maxWidth={500}>
      {props.sidebarOpen ?
        <MenuItems {...props} /> :
        <MainView {...props} />}
    </Responsive>
  </div>
)

const MenuItems = props => (
  <div className="menu-items">
    <Menu borderless>
      <Menu.Item onClick={props.onToggleSidebar}>
        <Icon name="angle left" size="big" />
      </Menu.Item>
      <PlayGroup
        position="right"
        playctl={props.playctl}
        isPlaying={props.player.get("isPlaying")} />
    </Menu>
    <Menu borderless fluid vertical>
      <Menu.Item name="search">
        <MediaSearch {...props} />
      </Menu.Item>
    </Menu>
  </div>
)

const MainView = props => (
  <div>
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
  </div>
)

const PowerBar = props => {
  const player = props.player.toObject()
  return (
    <Menu
        className="power-bar"
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
          playctl={props.playctl}
          isPlaying={player.isPlaying} />
      }
      {player.isControlVisible ?
        <Menu.Menu position="right">
          <Menu.Item
              fitted="vertically"
              active={player.isPowerOn}
              onClick={props.playctl.togglePower}
              disabled={!player.playerid}>
            <Icon name="power" size="large" />
          </Menu.Item>
        </Menu.Menu> :
        <VolumeGroup playctl={props.playctl} />
      }
    </Menu>
  )
}

const PlayGroup = props => {
  const playctl = props.playctl
  return <Menu.Menu position={props.position} icon>
    <Menu.Item
        onClick={() => playctl.command("playlist", "index", "-1")}
        disabled={!playctl.playerid}
        fitted>
      <Icon size="large" name="backward" />
    </Menu.Item>
    <Menu.Item
        onClick={() => playctl.command(props.isPlaying ? "pause" : "play")}
        disabled={!playctl.playerid}
        fitted="vertically">
      <Icon size="large" name={props.isPlaying ? "pause" : "play"} />
    </Menu.Item>
    <Menu.Item
        onClick={() => playctl.command("playlist", "index", "+1")}
        disabled={!playctl.playerid}
        fitted>
      <Icon size="large" name="forward" />
    </Menu.Item>
  </Menu.Menu>
}

const VolumeGroup = ({playctl}) => {
  return <Menu.Menu position="right" icon>
    <Menu.Item
        onClick={() => playctl.command("mixer", "volume", "-5")}
        disabled={!playctl.playerid}
        fitted="vertically">
      <Icon size="large" name="volume down" />
    </Menu.Item>
    <Menu.Item
        onClick={() => playctl.command("mixer", "volume", "+5")}
        disabled={!playctl.playerid}
        fitted="vertically">
      <Icon size="large" name="volume up" />
    </Menu.Item>
  </Menu.Menu>
}
