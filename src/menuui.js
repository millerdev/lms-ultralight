import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { useResizeDetector } from 'react-resize-detector'
import { Link, Routes, Route, useMatch } from 'react-router-dom'
import Alert from '@mui/material/Alert'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import Fade from '@mui/material/Fade'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListSubheader from '@mui/material/ListSubheader'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import { styled } from '@mui/material/styles'
import BedtimeOffRounded from '@mui/icons-material/BedtimeOffRounded'
import BedtimeRounded from '@mui/icons-material/BedtimeRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import FastForwardRounded from '@mui/icons-material/FastForwardRounded'
import FastRewindRounded from '@mui/icons-material/FastRewindRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import PowerSettingsNewRounded from '@mui/icons-material/PowerSettingsNewRounded'
import VolumeDownRounded from '@mui/icons-material/VolumeDownRounded'
import VolumeUpRounded from '@mui/icons-material/VolumeUpRounded'
import WarningRounded from '@mui/icons-material/WarningRounded'

import { LiveSeekBar, ProgressIndicator } from './components'
import MediaQuery from './mediaquery'
import MediaSession from './mediasession'
import pkg from '../package.json'
import * as player from './player'
import * as players from './playerselect'
import * as playlist from './playlist'
import { MediaBrowser } from './library'
import { TOOLBAR_HEIGHT } from './theme'
import { timer } from './util'

const DRAWER_WIDTH = 350

export const MainMenuUI = ({messages, players, onHideError, onPlayerSelected, ...props}) => (
  <MediaQuery down="sm">{ smallScreen =>
    <MainMenuRoot>
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
          <Route path="/menu/*" element={
            <SmallScreenMenu><MenuItems {...props} /></SmallScreenMenu>
          } />
          <Route path="*" element={
            <div>
              <MainView {...props} smallScreen />
              { props.miniPlayer && <PlayerBar {...props} bottom /> }
            </div>
          } />
        </Routes> :
        <SidebarMenu {...props} />
      }
    </MainMenuRoot>
  }</MediaQuery>
)

const SidebarMenu = (props) => {
  const menuOpen = !!useMatch("/menu/*")
  React.useEffect(() => {
    if (menuOpen) props.menuDidShow.fire()
  }, [menuOpen, props.menuDidShow])
  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="persistent"
        anchor="left"
        open={menuOpen}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRight: theme => `1px solid ${theme.palette.divider}`,
            top: TOOLBAR_HEIGHT,
            height: `calc(100% - ${TOOLBAR_HEIGHT})`,
          },
        }}
      >
        <MenuItems {...props} />
      </Drawer>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          marginLeft: menuOpen ? 0 : `-${DRAWER_WIDTH}px`,
          transition: theme => theme.transitions.create('margin-left'),
        }}
      >
        <MediaQuery up="md">{ wideScreen =>
          <MainView
            {...props}
            fixedTopWidth={wideScreen && menuOpen ? `calc(100% - ${DRAWER_WIDTH}px)` : '100%'}
          />
        }</MediaQuery>
      </Box>
    </Box>
  )
}

const MenuItems = ({player, playlist, ...props}) => (
  <List className="menu-items" disablePadding>
    <ListItem disablePadding>
      <MediaBrowser
        {...props}
        {...props.library}
        basePath="/menu"
        isPlaying={player.isPlaying}
        numTracks={playlist.numTracks}
      />
    </ListItem>
    <VersionItem>v{pkg.version}</VersionItem>
  </List>
)

const PlayerRedux = connect(state => state.player)(player.Player)
const PlaylistRedux = connect(state => state.playlist)(playlist.Playlist)

const MainView = props => {
  const { height, ref } = useResizeDetector({
    handleWidth: false,
    refreshMode: 'debounce',
    refreshRate: 50,
    observerOptions: { box: 'border-box' },
  })
  return (
    <MainViewBody className="mainview">
      { !props.miniPlayer &&
        <FixedTop
          className="fixed-top"
          ref={ref}
          fixedWidth={props.fixedTopWidth || '100%'}
        >
          <PlayerRedux
            playctl={props.playctl}
            toggleMiniPlayer={props.toggleMiniPlayer}
          />
        </FixedTop>
      }
      <MainContent
        topOffset={props.miniPlayer ? 0 : (height || 0)}
        hasBottomBar={props.smallScreen && props.miniPlayer}
      >
        <PlaylistRedux
          playctl={props.playctl}
          miniPlayer={props.miniPlayer}
          playerHeight={props.miniPlayer ? 0 : (height || 0)}
        />
        {props.children}
      </MainContent>
    </MainViewBody>
  )
}

const PowerBar = props => {
  const { playctl, player } = props
  const menuOpen = useMatch("/menu/*")
  return (
    <PowerBarRoot
      position="fixed"
      color="default"
      className="power-bar"
      elevation={1}
    >
      <Toolbar variant="dense" disableGutters sx={{ gap: 1, paddingX: 1 }}>
        <IconButton component={Link} to={menuOpen ? "/" : "/menu"} size="small">
          <MenuRounded fontSize="large" />
        </IconButton>
        <players.SelectPlayer
          playerid={player.playerid}
          onPlayerSelected={props.onPlayerSelected}
          dispatch={props.dispatch}
          {...props.players} />
        { props.showPlayer && <PlayerBar {...props} /> }
        <SleepDropdown player={player} playctl={playctl} />
        <PowerButton
          onClick={playctl.togglePower}
          disabled={!playctl.playerid}
          size="small"
          isPowerOn={player.isPowerOn}
        >
          <PowerSettingsNewRounded fontSize="large" />
        </PowerButton>
      </Toolbar>
      { props.showPlayer && <VolumeLevel value={player.volumeLevel} /> }
      { props.showPlayer && <SongProgress {...player} /> }
    </PowerBarRoot>
  )
}

const PlayerBar = props => {
  const playctl = props.playctl
  return <MediaQuery up="sm">{ wide => {
    const controls = <>
      { wide &&
        <IconButton
          onClick={playctl.prevTrack}
          disabled={!playctl.playerid}
          size="small"
        >
          <FastRewindRounded fontSize="large" />
        </IconButton>
      }
      <IconButton
        onClick={playctl.playPause}
        disabled={!playctl.playerid}
        size="small"
      >
        {playctl.isPlaying
          ? <PauseRounded fontSize="large" />
          : <PlayArrowRounded fontSize="large" />}
      </IconButton>
      { wide &&
        <IconButton
          onClick={playctl.nextTrack}
          disabled={!playctl.playerid}
          size="small"
        >
          <FastForwardRounded fontSize="large" />
        </IconButton>
      }
      <Box
        className="track-info"
        onClick={props.toggleMiniPlayer}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flex: '1 1 auto',
          minWidth: 0,
          overflow: 'hidden',
          cursor: 'pointer',
        }}
      >
        <Box
          component="img"
          src={playctl.imageUrl}
          sx={{ width: 32, height: 32, flex: '0 0 auto' }}
        />
        <Box sx={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Box>{playctl.tags.title}</Box>
          <Box>{playctl.tags.artist} - {playctl.tags.album}</Box>
        </Box>
      </Box>
      { (wide || props.bottom) && <VolumeGroup playctl={playctl} /> }
    </>
    if (props.bottom) {
      return (
        <AppBar
          position="fixed"
          color="default"
          elevation={0}
          sx={{
            top: 'auto',
            bottom: 0,
            borderTop: theme => `1px solid ${theme.palette.divider}`,
          }}
        >
          <Toolbar variant="dense" disableGutters sx={{ gap: 1, paddingX: 1 }}>
            {controls}
          </Toolbar>
          <SongProgress {...props.player} />
          <VolumeLevel value={props.player.volumeLevel} />
        </AppBar>
      )
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {controls}
      </Box>
    )
  }}</MediaQuery>
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
  <Fade in={!!messages.error} timeout={500} unmountOnExit>
    <Alert
      className="messages"
      severity="error"
      icon={<WarningRounded fontSize="large" />}
      onClose={onHideError}
      onClick={onHideError}
      action={
        <IconButton size="small" onClick={onHideError}>
          <CloseRounded fontSize="small" />
        </IconButton>
      }
      sx={{
        position: 'fixed',
        top: '3.7em',
        margin: '0.5em',
        width: 'calc(100% - 1em)',
        zIndex: 210,
      }}
    >
      {messages.error}
    </Alert>
  </Fade>
)

const VolumeGroup = ({playctl}) => (
  <>
    <IconButton
      onClick={playctl.volumeDown}
      disabled={!playctl.playerid}
      size="small"
      sx={{ marginLeft: 'auto' }}
    >
      <VolumeDownRounded fontSize="large" />
    </IconButton>
    <IconButton
      onClick={playctl.volumeUp}
      disabled={!playctl.playerid}
      size="small"
    >
      <VolumeUpRounded fontSize="large" />
    </IconButton>
  </>
)

const SLEEP_OPTIONS = [
  { label: "Until end of track", cmd: ["jiveendoftracksleep"] },
  { label: "15 minutes", cmd: ["sleep", "900"] },
  { label: "30 minutes", cmd: ["sleep", "1800"] },
  { label: "45 minutes", cmd: ["sleep", "2700"] },
  { label: "60 minutes", cmd: ["sleep", "3600"] },
  { label: "90 minutes", cmd: ["sleep", "5400"] },
  { label: "Cancel", cmd: ["sleep", "0"] },
]

const SleepDropdown = ({player, playctl}) => {
  const [showItem, setShowItem] = React.useState(false)
  const [anchorEl, setAnchorEl] = React.useState(null)
  const [hovered, setHovered] = React.useState(false)
  const menuOpen = !!anchorEl
  const visible = !!player.sleep || menuOpen || hovered
  const duration = visible ? 100 : 10000
  React.useEffect(() => { if (player.sleep) setShowItem(true) }, [player.sleep])
  const onExited = () => setShowItem(false)
  if (!(showItem || player.sleep)) return null
  const header = player.sleep
    ? "Sleeping in " + _.round(player.will_sleep_in / 60) + " minutes"
    : "Sleep cancelled"
  return (
    <>
      <Fade in={visible} timeout={duration} onExited={onExited}>
        <IconButton
          onClick={event => setAnchorEl(event.currentTarget)}
          size="small"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {player.sleep
            ? <BedtimeRounded fontSize="large" />
            : <BedtimeOffRounded fontSize="large" />}
        </IconButton>
      </Fade>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={() => setAnchorEl(null)}
      >
        <ListSubheader>{header}</ListSubheader>
        <Divider />
        {SLEEP_OPTIONS.map(opt => (
          <MenuItem
            key={opt.label}
            onClick={() => {
              playctl.command(...opt.cmd)
              setAnchorEl(null)
            }}
          >
            {opt.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  )
}

const PowerButton = styled(IconButton, {
  shouldForwardProp: prop => prop !== 'isPowerOn',
})(({ theme, isPowerOn }) => ({
  marginLeft: 'auto',
  color: isPowerOn ? theme.palette.text.primary : theme.palette.text.disabled,
}))

const PowerBarRoot = styled(AppBar)(({ theme }) => ({
  zIndex: theme.zIndex.drawer + 1,
}))

const VersionItem = styled(ListItem)(({ theme }) => ({
  color: theme.palette.text.disabled,
  fontSize: '0.85rem',
}))

const MainMenuRoot = styled('div')(({ theme }) => ({
  [theme.breakpoints.up('sm')]: {
    lineHeight: 1,
  },
  '& .progress-indicator': {
    position: 'absolute',
    left: 0,
    height: 2,
    backgroundColor: '#96dbfa',
  },
  '& .song-time.progress-indicator': {
    background: 'linear-gradient(to left, #74e3ec, #c7ffe2)',
    bottom: 0,
  },
  '& .volume-level.progress-indicator': {
    background: 'linear-gradient(to left, #ff6e56, #fffd86)',
    top: 0,
  },
}))

const SmallScreenMenu = styled('div')({
  paddingTop: TOOLBAR_HEIGHT,
})

const MainViewBody = styled(Box)({
  paddingTop: TOOLBAR_HEIGHT,
})

const FixedTop = styled(Box, {
  shouldForwardProp: prop => prop !== 'fixedWidth',
})(({ theme, fixedWidth = '100%' }) => ({
  position: 'fixed',
  top: `calc(${TOOLBAR_HEIGHT} - 1px)`,
  width: fixedWidth,
  paddingTop: theme.spacing(1),
  backgroundColor: theme.palette.background.paper,
  zIndex: 50,
}))

const MainContent = styled(Box, {
  shouldForwardProp: prop => prop !== 'topOffset' && prop !== 'hasBottomBar',
})(({ topOffset = 0, hasBottomBar = false }) => ({
  marginTop: topOffset,
  paddingBottom: hasBottomBar ? TOOLBAR_HEIGHT : 0,
}))
