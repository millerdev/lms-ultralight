import React from 'react'
import Media from 'react-media'
import { connect } from 'react-redux'
import ResizeAware from 'react-resize-aware'
import { Link, Route, Switch } from 'react-router-dom'
import { Icon, Image, Menu, Message, Sidebar, Transition } from 'semantic-ui-react'

import * as lms from './lmsclient'
import * as pkg from '../package.json'
import * as player from './player'
import * as players from './playerselect'
import { MediaBrowser } from './library'
import './menu.styl'

export const MainMenuUI = ({messages, players, onHideError, onPlayerSelected, ...props}) => (
  <Media query="(max-width: 500px)">{ smallScreen =>
    <div className="mainmenu">
      <PowerBar
        players={players}
        onPlayerSelected={onPlayerSelected}
        {...props}
      >
        { !smallScreen ? <PlayerBar {...props} /> : null }
      </PowerBar>
      <Toaster messages={messages} onHideError={onHideError} />
      { smallScreen ?
        <Switch>
          <Route path="/menu" render={() => <MenuItems {...props} />} />
          <Route render={() => (
            <div>
              <MainView {...props} smallScreen={smallScreen} />
              <PlayerBar {...props} bottom />
            </div>
          )} />
        </Switch> :
        <div>
          <Route path="/menu" children={({match: menuOpen}) => (
            <Sidebar
                as="div"
                className="sidebar"
                animation="push"
                width="wide"
                visible={!!menuOpen}>
              <MenuItems {...props} />
            </Sidebar>
          )} />
          <Sidebar.Pusher>
            <MainView {...props} />
          </Sidebar.Pusher>
        </div>
      }
    </div>
  }</Media>
)

const MenuItems = ({player, playlist, ...props}) => (
  <Menu borderless fluid vertical className="menu-items">
    <Menu.Item name="library">
      <MediaBrowser
        {...props}
        {...props.library}
        basePath="/menu"
        isPlaying={player.isPlaying}
        numTracks={playlist.numTracks}
      />
    </Menu.Item>
    <Menu.Item disabled>v{pkg.version}</Menu.Item>
  </Menu>
)

const Player = connect(state => {
  return {...state.player, currentTrack: state.playlist.currentTrack}
})(player.Player)

class MainView extends React.Component {
  constructor() {
    super()
    this.state = {playerHeight: 0}
  }
  onPlayerResize = ({height}) => {
    if (this.state.playerHeight !== height) {
      this.setState({playerHeight: height})
    }
  }
  render() {
    return (
      <div className="mainview ui grid">
        <ResizeAware
          style={{position: 'fixed'}}
          className="fixed-top"
          onResize={this.onPlayerResize}
          onlyEvent
        >
          <Player />
        </ResizeAware>
        <div
          className="sixteen wide column"
          style={{marginTop: this.state.playerHeight}}
        >
          {this.props.children}
        </div>
      </div>
    )
  }
}

const PowerBar = props => {
  const player = props.player
  return <Route path="/menu" children={({match: menuOpen}) => (
    <Menu className="power-bar" fixed="top" borderless>
      <Link to={ menuOpen ? "/" : "/menu" }>
        <Menu.Item>
          <Icon name="content" size="large" />
        </Menu.Item>
      </Link>
      <Menu.Item fitted>
        <players.SelectPlayer
          playerid={player.playerid}
          onPlayerSelected={props.onPlayerSelected}
          dispatch={props.dispatch}
          {...props.players} />
      </Menu.Item>
      {props.children}
      <Menu.Menu position="right">
        <Menu.Item
            fitted="vertically"
            active={player.isPowerOn}
            onClick={props.playctl.togglePower}
            disabled={!player.playerid}>
          <Icon name="power" size="large" />
        </Menu.Item>
      </Menu.Menu>
    </Menu>
  )} />
}

const PlayerBar = props => {
  const player = props.player
  const playctl = props.playctl
  const tags = props.playlist.currentTrack
  const playerid = props.player.playerid
  return (
    <Menu
      className={"player-bar" + (!props.bottom ? " embedded" : "")}
      fixed={ props.bottom ? "bottom" : null }
      borderless
    >
      <Menu.Item
        onClick={() => playctl.command(player.isPlaying ? "pause" : "play")}
        disabled={!playctl.playerid}
        fitted="vertically"
      >
        <Icon size="large" name={player.isPlaying ? "pause" : "play"} />
      </Menu.Item>
      <Menu borderless fluid className="track-info">
        <Menu.Item fitted>
          <Image size="mini" src={lms.getImageUrl(tags, playerid)} />
          <div className="tags">
            <div>{tags.title}</div>
            <div>{tags.artist} - {tags.album}</div>
          </div>
        </Menu.Item>
      </Menu>
      { props.bottom ? <VolumeGroup playctl={playctl} /> : null }
    </Menu>
  )
}

const Toaster = ({messages, onHideError}) => (
  <Transition
      visible={!!messages.error}
      animation="slide down"
      duration={500}
      unmountOnHide>
    <Message
        className="messages"
        onDismiss={onHideError}
        onClick={onHideError}
        size="small"
        negative>
      <Message.Content>
        <Icon name="warning" size="large" />
        {messages.error}
      </Message.Content>
    </Message>
  </Transition>
)

const VolumeGroup = ({playctl}) => {
  return <Menu.Menu position="right">
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
