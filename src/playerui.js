import _ from 'lodash'
import Slider from 'rc-slider'
import React from 'react'
import PropTypes from 'prop-types'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Stack from '@mui/material/Stack'
import { styled } from '@mui/material/styles'
import FastForwardRounded from '@mui/icons-material/FastForwardRounded'
import FastRewindRounded from '@mui/icons-material/FastRewindRounded'
import PauseRounded from '@mui/icons-material/PauseRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import RemoveRounded from '@mui/icons-material/RemoveRounded'
import 'rc-slider/assets/index.css'

import { drillable, RepeatShuffleGroup } from './components'
import { formatTime } from './util'

const ToolTipSlider = Slider.createSliderWithTooltip(Slider)

const CurrentTrackInfo = ({mediaNav, playctl: { imageUrl, tags }, children}) => (
  <TrackInfoRow>
    <Box component="img" src={imageUrl} className="track-image" />
    <Box className="track-content">
      {children}
      <Box className="track-header">{tags.title}</Box>
      <Box className="track-meta">{drillable(tags, "artist", mediaNav)}</Box>
      <Box className="track-meta">{drillable(tags, "album", mediaNav)}</Box>
    </Box>
  </TrackInfoRow>
)

CurrentTrackInfo.contextTypes = {
  mediaNav: PropTypes.func,
}

export class SeekBar extends React.Component {
  // TODO display time at mouse pointer on hover
  constructor() {
    super()
    this.state = {seeking: false, seek: 0}
  }
  render() {
    const elapsed = this.props.elapsed
    const total = this.props.total || elapsed
    return <SeekBarRow>
      <Box className="seek-time seek-time-left">
        {formatTime(elapsed)}
      </Box>
      <Box className="seek-slider">
        <ToolTipSlider
          max={_.max([total, elapsed, 1])}
          value={this.state.seeking ? this.state.seek : elapsed}
          onBeforeChange={seek => this.setState({seeking: true, seek})}
          onChange={seek => this.setState({seek})}
          onAfterChange={value => {
            this.props.onSeek(value < total ? value : total)
            this.setState({seeking: false})
          }}
          tipFormatter={formatTime}
          disabled={this.props.disabled} />
      </Box>
      <Box className="seek-time seek-time-right">
        {formatTime(total ? elapsed - total : 0)}
      </Box>
    </SeekBarRow>
  }
}

export class VolumeSlider extends React.Component {
  constructor() {
    super()
    this.state = {sliding: false, level: 0}
    this.marks = _.fromPairs(_.range(10, 100, 10).map(n => [n, ""]))
  }
  setVolume = _.throttle(level => this.props.playctl.setVolume(level), 500)
  render() {
    const { playerid, volumeLevel } = this.props
    return <ToolTipSlider
      marks={this.marks}
      value={this.state.sliding ? this.state.level : volumeLevel}
      onBeforeChange={level => this.setState({sliding: true, level})}
      onChange={level => {
        // TODO make volume adjustment UI smoother: decouple slider adjustment (and
        // state update) speed from sending events to the server
        this.setVolume(level)
        this.setState({level})
      }}
      onAfterChange={() => this.setState({sliding: false})}
      disabled={!playerid}
    />
  }
}

export const PlayerUI = props => {
  const { playctl } = props
  const disabled = !playctl.playerid
  return <PlayerRoot>
    <Box className="controls-row">
      <Stack direction="row" className="transport-controls">
        <IconButton onClick={playctl.prevTrack} disabled={disabled} size="small">
          <FastRewindRounded />
        </IconButton>
        <IconButton onClick={playctl.playPause} disabled={disabled} size="small">
          {playctl.isPlaying ? <PauseRounded /> : <PlayArrowRounded />}
        </IconButton>
        <IconButton onClick={playctl.nextTrack} disabled={disabled} size="small">
          <FastForwardRounded />
        </IconButton>
      </Stack>
      <Box className="volume-desktop">
        <VolumeSlider {...props} />
      </Box>
      <Box className="repeat-shuffle">
        <RepeatShuffleGroup
          repeatMode={props.repeatMode}
          setRepeatMode={value => playctl.command("playlist", "repeat", value)}
          shuffleMode={props.shuffleMode}
          setShuffleMode={value => playctl.command("playlist", "shuffle", value)}
          disabled={disabled}
        />
      </Box>
    </Box>
    <Box className="volume-mobile">
      <VolumeSlider {...props} />
    </Box>
    <CurrentTrackInfo playctl={playctl}>
      <IconButton
        onClick={props.toggleMiniPlayer}
        size="small"
        sx={{ float: "right" }}
      >
        <RemoveRounded />
      </IconButton>
    </CurrentTrackInfo>
    {props.children}
  </PlayerRoot>
}

const PlayerRoot = styled('div')(({ theme }) => ({
  '& .controls-row': {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
  },
  '& .transport-controls': {
    flex: '0 0 auto',
  },
  '& .volume-desktop': {
    flex: '1 1 auto',
    display: 'none',
    [theme.breakpoints.up('sm')]: {
      display: 'block',
    },
  },
  '& .repeat-shuffle': {
    flex: '0 0 auto',
    marginLeft: 'auto',
    textAlign: 'right',
  },
  '& .volume-mobile': {
    marginTop: theme.spacing(1),
    [theme.breakpoints.up('sm')]: {
      display: 'none',
    },
  },
}))

const SeekBarRow = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  '& .seek-time': {
    flex: '0 0 auto',
    minWidth: '3em',
  },
  '& .seek-time-right': {
    textAlign: 'right',
  },
  '& .seek-slider': {
    flex: '1 1 auto',
  },
}))

const TrackInfoRow = styled('div')(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginTop: theme.spacing(2),
  '& .track-image': {
    width: 80,
    height: 80,
    flex: '0 0 auto',
    objectFit: 'cover',
  },
  '& .track-content': {
    flex: '1 1 auto',
    minWidth: 0,
  },
  '& .track-header': {
    fontWeight: 600,
    fontSize: '1.1em',
  },
  '& .track-meta a': {
    color: theme.palette.primary.main,
    textDecoration: 'none',
    '&:hover': {
      textDecoration: 'underline',
    },
  },
}))
