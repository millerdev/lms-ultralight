import _ from 'lodash'
import React from 'react'
import Media from 'react-media'
import { connect } from 'react-redux'
import { useResizeDetector } from 'react-resize-detector'
import { Link, Routes, Route, useMatch } from 'react-router-dom'
import { Dropdown, Icon, Image, Menu, Message, Sidebar, Transition } from 'semantic-ui-react'

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
        <Routes>
          <Route path="/menu/*" element={<MenuItems {...props} />} />
          <Route path="*" element={
            <div>
              <MainView {...props} smallScreen />
              { props.miniPlayer && <PlayerBar {...props} bottom /> }
            </div>
          } />
        </Routes> :
        <SidebarMenu {...props} />
      }
    </div>
  }</Media>
)

const SidebarMenu = (props) => {
  const menuOpen = useMatch("/menu/*")
  return (
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
  )
}

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
  const { height, ref } = useResizeDetector({
    handleWidth: false,
    refreshMode: 'debounce',
    refreshRate: 50,
    observerOptions: { box: 'border-box' },
  })
  return (
    <div className="mainview ui grid">
      { !props.miniPlayer &&
        <div className="fixed-top" ref={ref}>
          <Player
            playctl={props.playctl}
            toggleMiniPlayer={props.toggleMiniPlayer}
          />
        </div>
      }
      <div
        className="sixteen wide column"
        style={{
          marginTop: props.miniPlayer ? 0 : height,
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
  const menuOpen = useMatch("/menu/*")
  return (
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
      <SleepDropdown player={player} playctl={playctl} />
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
  )
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

const SleepDropdown = ({player, playctl}) => {
  const [showItem, setShowItem] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const visible = player.sleep || menuOpen
  const duration = visible ? 100 : 10000
  React.useEffect(() => player.sleep && setShowItem(true), [player.sleep])
  const onHide = () => setShowItem(false)
  return !(showItem || player.sleep) ? null : (
    <Dropdown
      item
      onOpen={() => setMenuOpen(true)}
      onClose={() => setMenuOpen(false)}
      trigger={
        <Transition visible={visible} duration={duration} onHide={onHide}>
          <Icon name="bed" size="large"/>
        </Transition>
      }
    >
      <Dropdown.Menu>
        <Dropdown.Header content={ player.sleep
          ? "Sleeping in " + _.round(player.will_sleep_in / 60) + " minutes"
          : "Sleep cancelled"
        } />
        <Dropdown.Divider />
        <Dropdown.Item text="Until end of track" onClick={() => playctl.command("jiveendoftracksleep")} />
        <Dropdown.Item text="15 minutes" onClick={() => playctl.command("sleep", "900")} />
        <Dropdown.Item text="30 minutes" onClick={() => playctl.command("sleep", "1800")} />
        <Dropdown.Item text="45 minutes" onClick={() => playctl.command("sleep", "2700")} />
        <Dropdown.Item text="60 minutes" onClick={() => playctl.command("sleep", "3600")} />
        <Dropdown.Item text="90 minutes" onClick={() => playctl.command("sleep", "5400")} />
        <Dropdown.Item text="Cancel" onClick={() => playctl.command("sleep", "0")} />
      </Dropdown.Menu>
    </Dropdown>
  )
}
