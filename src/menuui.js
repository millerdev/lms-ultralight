import React from 'react'
import Media from 'react-media'
import { connect } from 'react-redux'
import ReactResizeDetector from 'react-resize-detector'
import { Link, Route, Switch } from 'react-router-dom'
import { Icon, Image, Menu, Message, Sidebar, Transition } from 'semantic-ui-react'

import { LiveSeekBar, ProgressIndicator } from './components'
import MediaSession from './mediasession'
import pkg from '../package.json'
import * as player from './player'
import * as players from './playerselect'
import * as playlist from './playlist'
import { MediaBrowser } from './library'
import { timer } from './util'
import './menu.styl'

export const MainMenuUI = ({messages, players, onHideError, onPlayerSelected, ...props}) => (
  <Media query="(max-width: 500px)">{ smallScreen =>
    <div className="mainmenu">
      <PowerBar
        players={players}
        onPlayerSelected={onPlayerSelected}
        showPlayer={!smallScreen && props.miniPlayer}
        {...props}
      />
      <MediaSession playctl={props.playctl} />
      <Toaster messages={messages} onHideError={onHideError} />
      { smallScreen ?
        <Switch>
          <Route path="/menu" render={() => <MenuItems {...props} />} />
          <Route render={() => (
            <div>
              <MainView {...props} smallScreen />
              { props.miniPlayer && <PlayerBar {...props} bottom /> }
            </div>
          )} />
        </Switch> :
        <Route path="/menu" children={({match: menuOpen}) => (
          <div>
            <Sidebar
                as="div"
                animation="push"
                width="wide"
                onVisible={props.menuDidShow.fire}
                visible={!!menuOpen}>
              <MenuItems {...props} />
            </Sidebar>
            <Media query="(min-width: 850px)">{ wideScreen =>
              <Sidebar.Pusher className={wideScreen && menuOpen ? "wide-fit" : null}>
                <MainView {...props} />
              </Sidebar.Pusher>
            }</Media>
          </div>
        )} />
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

const Player = connect(state => state.player)(player.Player)
const Playlist = connect(state => state.playlist)(playlist.Playlist)

const MainView = props => {
  function onPlayerResize(width, height) {
    if (playerHeight !== height) {
      setPlayerHeight(height)
    }
  }
  const [playerHeight, setPlayerHeight] = React.useState(0)
  return (
    <div className="mainview ui grid">
      { !props.miniPlayer &&
        <ReactResizeDetector onResize={onPlayerResize}>
          <div className="fixed-top">
            <Player
              playctl={props.playctl}
              toggleMiniPlayer={props.toggleMiniPlayer}
            />
          </div>
        </ReactResizeDetector>
      }
      <div
        className="sixteen wide column"
        style={{
          marginTop: props.miniPlayer ? 0 : playerHeight,
          marginBottom: props.smallScreen && props.miniPlayer ? "3em" : 0,
        }}
      >
        <Playlist playctl={props.playctl} />
        {props.children}
      </div>
    </div>
  )
}

const PowerBar = props => {
  const { playctl, player } = props
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
      { props.showPlayer && <PlayerBar {...props} /> }
      <Menu.Menu position="right">
        <Menu.Item
            active={player.isPowerOn}
            onClick={playctl.togglePower}
            disabled={!playctl.playerid}>
          <Icon name="power" size="large" />
        </Menu.Item>
      </Menu.Menu>
      { props.showPlayer && <VolumeLevel value={player.volumeLevel} /> }
      { props.showPlayer && <SongProgress {...player} /> }
    </Menu>
  )} />
}

const PlayerBar = props => {
  const playctl = props.playctl
  return <Media query="(min-width: 700px)">{ wider =>
    <Menu
      className="player-bar"
      fixed={ props.bottom && "bottom" }
      borderless
    >
      { wider && <Menu.Item
        onClick={playctl.prevTrack}
        disabled={!playctl.playerid}
        fitted="vertically"
      >
        <Icon size="large" name="backward" />
      </Menu.Item> }
      <Menu.Item
        onClick={playctl.playPause}
        disabled={!playctl.playerid}
        fitted="vertically"
      >
        <Icon size="large" name={playctl.isPlaying ? "pause" : "play"} />
      </Menu.Item>
      { wider && <Menu.Item
        onClick={playctl.nextTrack}
        disabled={!playctl.playerid}
        fitted="vertically"
      >
        <Icon size="large" name="forward" />
      </Menu.Item> }
      <Menu borderless fluid className="track-info">
        <Menu.Item onClick={props.toggleMiniPlayer} fitted>
          <Image size="mini" src={playctl.imageUrl} />
          <div className="tags">
            <div>{playctl.tags.title}</div>
            <div>{playctl.tags.artist} - {playctl.tags.album}</div>
          </div>
        </Menu.Item>
      </Menu>
      <Media query="(min-width: 600px)">
        { wide => (wide || props.bottom) && <VolumeGroup playctl={playctl} /> || null }
      </Media>
      { props.bottom && <SongProgress {...props.player} /> }
      { props.bottom && <VolumeLevel value={props.player.volumeLevel} /> }
    </Menu>
  }</Media>
}

const SongProgress = props => (
  <LiveSeekBar
    component={ProgressIndicator}
    className="song-time"
    isPlaying={props.isPlaying}
    localTime={props.localTime}
    elapsed={props.elapsedTime}
    total={props.totalTime}
  />
)

class VolumeLevel extends React.PureComponent {
  constructor(props) {
    super(props)
    this.timer = timer()
    this.state = {visible: false}
  }
  componentDidUpdate(prevProps) {
    if (prevProps.value !== this.props.value) {
      this.setState({visible: true})
      this.timer.clear()
      this.timer.after(3000, () => this.setState({visible: false}))
    }
  }
  render() {
    return this.state.visible && <ProgressIndicator
      className="volume-level"
      elapsed={this.props.value}
      total={100}
    />
  }
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
        onClick={playctl.volumeDown}
        disabled={!playctl.playerid}
        fitted="vertically">
      <Icon size="large" name="volume down" />
    </Menu.Item>
    <Menu.Item
        onClick={playctl.volumeUp}
        disabled={!playctl.playerid}
        fitted="vertically">
      <Icon size="large" name="volume up" />
    </Menu.Item>
  </Menu.Menu>
}
