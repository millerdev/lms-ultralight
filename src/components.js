import _ from 'lodash'
import React, { useContext } from 'react'
import Backdrop from '@mui/material/Backdrop'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import { styled } from '@mui/material/styles'
import AddRounded from '@mui/icons-material/AddRounded'
import ArrowRightAltRounded from '@mui/icons-material/ArrowRightAltRounded'
import CloseRounded from '@mui/icons-material/CloseRounded'
import InfoRounded from '@mui/icons-material/InfoRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import RepeatOneRounded from '@mui/icons-material/RepeatOneRounded'
import RepeatRounded from '@mui/icons-material/RepeatRounded'
import ShuffleOnRounded from '@mui/icons-material/ShuffleOnRounded'
import ShuffleRounded from '@mui/icons-material/ShuffleRounded'
import SkipNextRounded from '@mui/icons-material/SkipNextRounded'
import SortRounded from '@mui/icons-material/SortRounded'

import * as lms from './lmsclient'
import { MenuContext } from './menucontext'
import { formatTime, timer } from './util'

export const MediaInfo = (props) => {
  const { mediaNav: contextMediaNav } = useContext(MenuContext)
  const mediaNav = props.mediaNav || contextMediaNav
  const item = props.item
  const compact = props.imageSize === "tiny"
  const buttons = props.button ||
    <PlaylistButtons
      play={() => props.playctl.playItems([item])}
      playNext={() => props.playctl.playNext(item)}
      addToPlaylist={() => props.playctl.addToPlaylist([item])}
    />
  const descriptions = _.map(["artist", "album"], key => _.has(item, key) ?
    <Box className="media-info-description" key={key}>
      {drillable(item, key, mediaNav)}
    </Box> : "",
  )
  return (
    <MediaInfoRoot
      className={compact ? "compact" : undefined}
      onContextMenu={e => e.stopPropagation()}
      onMouseDown={allowMediaInfoTextSelection}
    >
      <Box className="media-info-header">
        <Box
          component="img"
          src={lms.getImageUrl(item)}
          className="media-info-image"
          sx={{ width: compact ? 80 : 150 }}
        />
        { compact ? (
          <Box className="media-info-actions">{buttons}</Box>
        ) : (
          <Box className="media-info-body">
            <Box className="media-info-actions">
              { props.onClose ?
                <MediaInfoCloseButton
                  onClick={props.onClose}
                  size="small"
                  aria-label="close"
                  disableRipple
                >
                  <CloseRounded fontSize="small" />
                </MediaInfoCloseButton> : null
              }
            </Box>
            <Box className="media-info-title-row">
              {buttons}
              <Box className="media-info-title">{item.title}</Box>
            </Box>
            {descriptions}
          </Box>
        )}
      </Box>
      { compact && (
        <Box className="media-info-body">
          <Box className="media-info-title">{item.title}</Box>
          {descriptions}
        </Box>
      )}
      <Box className="media-info-details">
        <Backdrop
          open={props.isLoading || false}
          sx={{
            position: 'absolute',
            color: 'text.primary',
            backgroundColor: theme => theme.palette.mode === 'dark'
              ? 'rgba(0, 0, 0, 0.7)'
              : 'rgba(255, 255, 255, 0.7)',
            zIndex: theme => theme.zIndex.drawer + 1,
          }}
        >
          <CircularProgress color="inherit" />
        </Backdrop>
        {_.map(MEDIA_INFO, info =>
          !info.display(item[info.key], item, info.key) ? null :
            <Box className="media-info-description" key={info.key}>
              {info.name}: {info.transform(item[info.key], item, info, mediaNav)}
            </Box>,
        )}
      </Box>
    </MediaInfoRoot>
  )
}

function allowMediaInfoTextSelection(e) {
  // Temporarily disable draggable on the nearest draggable ancestor while the
  // mouse button is held, so the browser allows text selection instead of drag.
  const draggable = e.currentTarget.closest('[draggable="true"]')
  if (draggable) {
    draggable.setAttribute('draggable', 'false')
    document.addEventListener('mouseup', () => {
      draggable.setAttribute('draggable', 'true')
    }, { once: true })
  }
}


export function drillable(item, key, mediaNav) {
  const text = item[key]
  if (mediaNav) {
    let id = item[key + "_id"]
    if (id === undefined) {
      id = item[key + "_ids"]
      if (_.isArray(id)) {
        id = id[0]
      }
    }
    if (id) {
      key = _.has(DRILL_KEYS, key) ? DRILL_KEYS[key] : key
      item = {type: key, id, [key]: text, title: text}
      return mediaNav(item).link()
    }
  }
  return text
}

const DRILL_KEYS = {
  artist: "contributor",
  albumartist: "contributor",
  band: "contributor",
  composer: "contributor",
  conductor: "contributor",
}

function drillTransform(value, item, info, mediaNav) {
  return drillable(item, info.key, mediaNav)
}

function urlToPath(url, item) {
  if (url.startsWith("file://")) {
    url = url.slice(7)
  }
  if (url.indexOf("%") > -1) {
    url = decodeURI(url)
  }
  if (_.has(item, "id")) {
    const filename = url.slice(url.lastIndexOf("/") + 1)
    const href = "/music/" + item.id + "/download/" + encodeURI(filename)
    url = <a href={href}>{url}</a>
  }
  return url
}

function bytesToSize(bytes) {
  // https://stackoverflow.com/a/18650828/10840
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  if (bytes == 0) {
    return '0 Bytes'
  }
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i]
}

const yesno = value => (value && value !== "0") ? "yes" : "no"

const MEDIA_INFO = [
  {key: "composer", transform: drillTransform},
  {key: "conductor", transform: drillTransform},
  {key: "band", transform: drillTransform},
  {key: "albumartist", name: "Album artist", transform: drillTransform},
  {key: "compilation", transform: yesno, display: v => yesno(v) === "yes"},
  {key: "remote_title", name: "Radio station"},
  {key: "genre", transform: drillTransform},
  {key: "genres"},
  {key: "year"},
  {key: "tracknum", name: "Track"},
  {key: "disc", transform: (value, item) =>
    value + (item.disccount ? " of " + item.disccount : "")},
  {key: "duration", transform: formatTime},
  {key: "comment"},
  {key: "rating"},
  {key: "playcount", name: "Play count"},
  {key: "bpm", name: "Beats per minute"},
  {key: "album_replay_gain", transform: value => value + " dB"},
  {key: "replay_gain", transform: value => value + " dB"},
  {key: "musicmagic_mixable", name: "Mixable", transform: yesno},
  {key: "tagversion", name: "Tag version"},
  {key: "samplerate", name: "Sample rate", transform: value => value + " KHz"},
  {key: "samplesize", name: "Sample size", transform: value => value + " bits"},
  {key: "bitrate"},
  {key: "content_type"},
  {key: "filesize", name: "Size", transform: bytesToSize},
  {key: "url", name: "Location", transform: urlToPath},
  {key: "modificationTime", name: "Modified"},
  {key: "lastUpdated", name: "Updated"},
  {key: "addedTime", name: "Added"},
  {key: "lyrics"},
]

_.each(MEDIA_INFO, item => {
  if (!item.name) {
    item.name = _.upperFirst(item.key.replace(/_/g, " "))
  }
  if (!item.transform) {
    item.transform = value => value
  }
  if (!item.display) {
    item.display = (value, item, key) => _.has(item, key)
  }
})

export const PlaylistButtons = props => {
  const className = _.filter(["playlist-buttons", props.className]).join(" ")
  return (
    <PlaylistButtonGroup
      size="small"
      onClick={event => event.stopPropagation()}
      className={className}
    >
      <Button onClick={props.play} aria-label="play">
        <PlayArrowRounded fontSize="small" />
      </Button>
      <Button
        disabled={!props.playNext}
        onClick={props.playNext}
        aria-label="play next"
      >
        <SkipNextRounded fontSize="small" />
      </Button>
      <Button onClick={props.addToPlaylist} aria-label="add to playlist">
        <AddRounded fontSize="small" />
      </Button>
    </PlaylistButtonGroup>
  )
}

export const RepeatShuffleGroup = ({
  repeatMode,
  setRepeatMode,
  shuffleMode,
  setShuffleMode,
  disabled=false,
  ...props
}) => (
  <ButtonGroup size="small" {...props}>
    <NWayButton
      markup={[
        <ArrowRightAltRounded fontSize="small" key="no-repeat" />,
        <RepeatOneRounded fontSize="small" key="repeat-one" />,
        <RepeatRounded fontSize="small" key="repeat-all" />,
      ]}
      value={repeatMode}
      setValue={setRepeatMode}
      disabled={disabled}
      aria-label="repeat mode" />
    <NWayButton
      markup={[
        <SortRounded fontSize="small" key="no-shuffle" />,
        <ShuffleRounded fontSize="small" key="shuffle-songs" />,
        <ShuffleOnRounded fontSize="small" key="shuffle-albums" />,
      ]}
      value={shuffleMode}
      setValue={setShuffleMode}
      disabled={disabled}
      aria-label="shuffle mode" />
  </ButtonGroup>
)

const NWayButton = ({
  markup,
  value,
  setValue,
  next=(value + 1 >= markup.length ? 0 : value + 1),
  ...props
}) => (
  <Button onClick={() => setValue(next)} {...props}>
    {markup[value]}
  </Button>
)

export const TrackInfoIcon = React.memo(function TrackInfoIcon(props) {
  const dims = props.smallScreen ? ICON_STYLES.large : ICON_STYLES.small
  const icon = props.icon ? <props.icon sx={dims} /> : <InfoRounded sx={dims} />
  const activeIcon = props.activeIcon ? <props.activeIcon sx={dims} /> : null
  return <HoverIconContainer
    onClick={props.onClick}
    className={"tap-zone" + (props.smallScreen ? " left-floated" : "")}
  >
    { props.showInfoIcon || activeIcon ?
      <Box className="hover-icon" sx={dims}>
        {props.showInfoIcon ? icon : activeIcon}
      </Box> :
      <Box
        component="img"
        src={lms.getImageUrl(props.item)}
        className="hover-icon tap-zone"
        sx={dims}
      />
    }
    <Box className="hover-icon-middle" sx={dims}>{icon}</Box>
  </HoverIconContainer>
})

const ICON_STYLES = {
  large: { height: "36px", width: "36px" },
  small: { height: "20px", width: "20px" },
}

export const DragHandle = () => (
  <Box component="span" sx={{ ml: 1 }}>
    <MenuRounded fontSize="small" />
  </Box>
)

export class LiveSeekBar extends React.Component {
  constructor(props) {
    super(props)
    this.timer = timer()
  }
  getElapsedWait(props) {
    if (!props.isPlaying || !props.localTime) {
      return [props.elapsed || 0, null]
    }
    const now = new Date()
    const playtime = props.elapsed + (now - props.localTime) / 1000
    const wait = Math.round((1 - playtime % 1) * 1000)
    const floored = Math.floor(playtime)
    const elapsed = _.min([floored, props.total || floored])
    return [elapsed, wait]
  }
  componentWillUnmount() {
    this.timer.clear()
  }
  render () {
    const [elapsed, wait] = this.getElapsedWait(this.props)
    this.timer.clear()
    if (wait !== null) {
      this.timer.after(wait, this.forceUpdate.bind(this))
    }
    return <this.props.component {...this.props} elapsed={elapsed} />
  }
}

export const ProgressIndicator = props => {
  const cls = (props.className || "") + " progress-indicator"
  const percent = (props.elapsed / props.total) * 100
  return <div className={cls} style={{width: percent + "%"}} />
}

const HoverIconContainer = styled('div')({
  position: 'relative',
  display: 'inline-block',
  verticalAlign: 'middle',
  marginTop: '3px',
  zIndex: 5,
  '&.left-floated': {
    float: 'left',
  },
  '& .hover-icon': {
    transition: '.1s ease',
    backfaceVisibility: 'hidden',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '&:hover .hover-icon': {
    opacity: 0,
  },
  '& .hover-icon-middle': {
    transition: '.1s ease',
    opacity: 0,
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  '&:hover .hover-icon-middle': {
    opacity: 1,
  },
})

// && doubles the specificity to override the theme's MuiIconButton styleOverrides
// which apply a gray background to all IconButtons unconditionally.
const MediaInfoCloseButton = styled(IconButton)({
  '&&': {
    backgroundColor: 'transparent',
  },
})

// ButtonGroup adds a border between each button as a divider. PlaylistButtons
// are small icon buttons where the dividers are visually noisy — remove them.
const PlaylistButtonGroup = styled(ButtonGroup)({
  '&& .MuiButtonGroup-grouped:not(:last-of-type)': {
    borderRight: 'none',
  },
})

const MediaInfoRoot = styled('div')(({ theme }) => ({
  position: 'relative',
  userSelect: 'text',
  cursor: 'auto',
  '&.compact': {
    padding: theme.spacing(0, 1),
  },
  '& .media-info-header': {
    display: 'flex',
    gap: theme.spacing(2),
  },
  '& .media-info-image': {
    flex: '0 0 auto',
    objectFit: 'cover',
  },
  '& .media-info-body': {
    flex: '1 1 auto',
    minWidth: 0,
    position: 'relative',
  },
  '& .media-info-actions': {
    // float: right applies in full mode (block context inside media-info-body);
    // in compact mode (flex context inside media-info-header) float is ignored
    // and marginLeft: auto pushes the buttons to the right.
    float: 'right',
    marginLeft: 'auto',
  },
  '& .media-info-title-row': {
    display: 'flex',
    alignItems: 'flex-start',
    gap: theme.spacing(1),
  },
  '& .media-info-title': {
    fontWeight: 600,
    fontSize: '1.2em',
  },
  '& .media-info-description': {
    marginTop: theme.spacing(0.25),
    [theme.breakpoints.up('sm')]: {
      marginTop: theme.spacing(1),
    },
    '& a': {
      textDecoration: 'none',
    },
  },
  '& .media-info-details': {
    position: 'relative',
    marginTop: theme.spacing(2),
  },
}))
