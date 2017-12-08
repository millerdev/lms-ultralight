import React from 'react'
import { Icon, Menu, Message, Sidebar, Transition } from 'semantic-ui-react'

import * as players from './playerselect'
import { MediaSearch } from './search'
import './menu.styl'

export const MainMenuUI = props => (
  <div className="mainmenu">
    <Sidebar
        as={Menu}
        animation="push"
        width="wide"
        visible={props.sidebarOpen}
        borderless
        style={{border: "none"}}
        vertical>
      <Menu.Item header name="ultralight" onClick={props.onToggleSidebar}>
        <Icon name="close" /> Ultralight
      </Menu.Item>
      <Menu.Item name="search">
        <MediaSearch {...props} />
      </Menu.Item>
    </Sidebar>
    <Sidebar.Pusher>
      <PowerBar {...props} />
      <Transition
          visible={!!props.messages.error}
          animation='slide down'
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
      <div className="ui padded grid">
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
        fixed={props.sidebarOpen ? null : "top"}
        size="small"
        borderless>
      <Menu.Item fitted="vertically" onClick={props.onToggleSidebar}>
        <Icon name="content" size="large" />
      </Menu.Item>
      <Menu.Item fitted>
        <players.SelectPlayer
          playerid={player.playerid}
          onPlayerSelected={props.onPlayerSelected}
          dispatch={props.dispatch}
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
