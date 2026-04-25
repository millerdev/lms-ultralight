import _ from 'lodash'
import React from 'react'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import ButtonGroup from '@mui/material/ButtonGroup'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import IconButton from '@mui/material/IconButton'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import TextField from '@mui/material/TextField'
import DeleteRounded from '@mui/icons-material/DeleteRounded'
import FastForwardRounded from '@mui/icons-material/FastForwardRounded'
import FastRewindRounded from '@mui/icons-material/FastRewindRounded'
import MenuRounded from '@mui/icons-material/MenuRounded'
import PlayArrowRounded from '@mui/icons-material/PlayArrowRounded'
import PlayCircleRounded from '@mui/icons-material/PlayCircleRounded'
import SaveRounded from '@mui/icons-material/SaveRounded'

import { DragHandle, MediaInfo, RepeatShuffleGroup, TrackInfoIcon } from './components'
import { effect, combine } from './effects'
import * as lms from './lmsclient'
import { MEDIA_ITEMS } from './library'
import MediaQuery from './mediaquery'
import { TOOLBAR_HEIGHT } from './theme'
import { MenuContext } from './menucontext'
import makeReducer from './store'
import { TouchList } from './touch'
import { formatTime, objectId, operationError, timer } from './util'
import { styled } from '@mui/material/styles'

export const IX = "playlist index"
export const SINGLE = "single"
export const TO_LAST = "to last"
const TWO_MINUTES = 2 * 60 * 1000  // in ms

export const defaultState = {
  playerid: null,
  items: [],
  timestamp: null,
  repeatMode: 0,
  shuffleMode: 0,
  numTracks: 0,
  currentIndex: null,
  currentTrack: {},
  selection: new Set(),
  fullTrackInfo: {},
}

export const reducer = makeReducer({
  "ref:gotPlayer": (state, action, status, {ignoreChange=false}={}) => {
    const effects = []
    const list = status.playlist_loop
    const data = {
      playerid: status.playerid,
      numTracks: status.playlist_tracks,
      currentTrack: state.currentTrack,
      repeatMode: status["playlist repeat"],
      shuffleMode: status["playlist shuffle"],
      timestamp: status.playlist_timestamp || null,
    }
    if (list) {
      const index = parseInt(status.playlist_cur_index)
      const changed = !ignoreChange && isPlaylistChanged(state, data)
      const gotCurrent = index >= list[0][IX] && index <= list[list.length - 1][IX]
      data.currentIndex = index
      if (status.isPlaylistUpdate || changed) {
        const sameSize = data.numTracks === state.numTracks
        data.items = sameSize ? mergePlaylist(list, state.items) : list
        if (gotCurrent) {
          data.currentTrack = list[index - list[0][IX]]
        }
      } else if (!_.isEqual(list[0], data.currentTrack) || !data.currentTrack) {
        data.currentTrack = list[0] || {}
      }
      if (changed && (!status.isPlaylistUpdate || !gotCurrent)) {
        effects.push(effect(loadPlayer, data.playerid, true))
      }
    } else {
      data.items = []
      data.currentIndex = null
      data.currentTrack = {}
    }
    if (!list || state.playerid !== data.playerid) {
      data.selection = new Set()
    }
    return combine({...state, ...data}, effects)
  },
  "ref:advanceToNextTrack": (state, action, playerid) => {
    const items = state.items
    const index = state.currentIndex
    const nextIndex = index === null ? null : (index + 1)
    const nextTrack = nextIndex === null ? null :
      _.find(items, item => item[IX] === nextIndex)
    const effects = []
    if (nextIndex !== null && nextTrack) {
      state = {
        ...state,
        currentTrack: nextTrack,
        currentIndex: nextIndex,
      }
    } else {
      effects.push(effect(
        loadPlayer,
        playerid,
        true,
      ))
    }
    return combine(state, effects)
  },
  playlistChanged: (state, action, status) => {
    if (state.playerid !== status.playerid) {
      throw new Error("active player changed unexpectedly")
    }
    return {
      ...state,
      timestamp: status.playlist_timestamp,
      numTracks: status.playlist_tracks,
    }
  },
  playlistItemMoved: (state, action, fromIndex, toIndex, item) => {
    const selection = state.selection
    let currentIndex = state.currentIndex
    let between, stop, step
    if (fromIndex < toIndex) {
      between = i => i > fromIndex && i < toIndex
      stop = toIndex
      step = 1
    } else { // fromIndex > toIndex
      between = i => i >= toIndex && i < fromIndex
      stop = toIndex - 1
      step = -1
    }
    if (fromIndex === currentIndex) {
      currentIndex = toIndex + (fromIndex < toIndex ? -1 : 0)
    } else if (between(currentIndex)) {
      currentIndex -= step
    }
    const reindex = i => between(i) ? i - step : i
    const deselect = new Set(
      _.takeWhile(
        _.range(fromIndex, stop, step),
        i => i === fromIndex || selection.has(i)
      )
    )
    return {
      ...state,
      items: moveItem(state.items, fromIndex, toIndex, item),
      timestamp: null,
      selection: new Set(
        [...selection].filter(x => !deselect.has(x)).map(reindex)
      ),
      currentIndex: currentIndex,
      currentTrack: {...state.currentTrack, [IX]: currentIndex},
      numTracks: _.max([state.numTracks, fromIndex + 1]),
    }
  },
  playlistItemDeleted: (state, action, index) => {
    const oldItems = state.items
    const items = deleteItem(oldItems, index)
    if (items === oldItems) {
      return {...state, timestamp: null}
    }
    const reindex = x => x > index ? x -= 1 : x
    const data = {
      items,
      numTracks: state.numTracks - 1,
      timestamp: null,
      selection: new Set(
        [...state.selection]
        .filter(x => x !== index)
        .map(reindex)
      ),
    }
    const currentIndex = state.currentIndex
    if (index <= currentIndex) {
      data.currentIndex = currentIndex - 1
      data.currentTrack = {...state.currentTrack, [IX]: currentIndex - 1}
    }
    return {...state, ...data}
  },
  selectionChanged: (state, action, selection) => {
    return {...state, selection}
  },
  clearSelection: state => ({...state, selection: new Set()}),
  loadedTrackInfo: (state, action, info) => {
    const now = new Date()
    const infos = {}
    // clone, keeping only unexpired info
    _.forOwn(state.fullTrackInfo, (value, key) => {
      if (value && value.expirationDate > now) {
        infos[key] = value
      }
    })
    infos[info.id] = info
    return {...state, fullTrackInfo: infos}
  },
}, defaultState)

const actions = reducer.actions

export function loadPlayer(...args) {
  return require("./player").loadPlayer(...args)
}

function insertPlaylistItems(playerid, items, params, index, dispatch, numTracks) {
  const insert = (items, index, numTracks) => {
    if (!items.length) {
      return
    }
    const item = items.shift()
    const param = lms.getControlParam(item)
    if (param) {
      lms.command(playerid, "playlistcontrol", "cmd:add", param, ...params)
        .then(() => lms.getPlayerStatus(playerid, numTracks, 100))
        .then(data => {
          dispatch(actions.playlistChanged(data))
          if (index < numTracks) {
            // Move item from end of playlist to insert position
            const selection = new Set(_.range(numTracks, data.playlist_tracks))
            return moveItems(selection, index, playerid, dispatch, lms, data.playlist_loop)
          }
        })
        .then(() => lms.getPlayerStatus(playerid))
        .then(data => {
          dispatch(actions.gotPlayer(data, {ignoreChange: true}))
          const length = data.playlist_tracks
          const inserted = length - numTracks
          if (inserted >= 0) {
            insert(items, index + inserted, length)
          }
        })
        .catch(err => {
          dispatch(operationError("Insert error", err))
        })
    } else {
      window.console.log("unknown item", item)
      insert(items, index, numTracks)
    }
  }
  insert(items, index, numTracks)
}

/**
 * Move items to playlist index
 *
 * @param selection Array of item indices to move.
 * @param toIndex Playlist index where items should be moved.
 * ...
 * @param items Optional array of items that are being moved and
 * have not yet been loaded into the playlist.
 * @returns A promise that resoves when the move is complete.
 */
export function moveItems(selection, toIndex, playerid, dispatch, lms, items) {
  return new Promise(resolve => {
    function move(pairs) {
      if (!pairs.length) {
        return resolve(true)
      }
      const [from, to] = pairs.shift()
      lms.command(playerid, "playlist", "move", from, to > from ? to - 1 : to)
        .then(() => {
          // TODO abort if playerid or selection changed
          const haveItem = items && items.length && items[0][IX] === from
          const item = haveItem ? items.shift() : null
          dispatch(actions.playlistItemMoved(from, to, item))
          move(pairs)
        })
        .catch(err => {
          dispatch(operationError("Move error", err))
          resolve(true)
        })
    }
    function getMoves(selected) {
      const len = selected.length
      let min = _.min([toIndex, _.min(selected)])
      let max = _.max([toIndex - 1, _.max(selected)]) + 1
      const invert = max - min - len < len
      if (invert) {
        return _.range(min, max)
          .filter(i => !selection.has(i))
          .map(i => i < toIndex ? [i, min++] : [i, max])
      }
      min = max = toIndex
      return selected.map(i => i < toIndex ? [i, min--] : [i, max++])
    }
    const isValidMove = (from, to) => from !== to && from + 1 !== to
    let pairs
    if (selection.size) {
      const selected = [...selection].sort()
      const botMoves = getMoves(selected.filter(i => i < toIndex).reverse())
      const topMoves = getMoves(selected.filter(i => i >= toIndex))
      pairs = botMoves.concat(topMoves).filter(([f, t]) => isValidMove(f, t))
      if (!pairs.length) {
        return resolve(false)
      }
    } else {
      return resolve(false)
    }
    move(pairs)
  })
}

export function deleteSelection(playerid, selection, dispatch, lms) {
  return new Promise(resolve => {
    function remove(indices) {
      if (!indices.length) {
        return resolve()
      }
      const index = indices.shift()
      lms.command(playerid, "playlist", "delete", index)
        .then(() => {
          // TODO abort if playerid or selection changed
          dispatch(actions.playlistItemDeleted(index))
          remove(indices)
        })
        .catch(err => {
          dispatch(operationError("Delete error", err))
          resolve()
        })
    }
    remove(_.sortBy([...selection], index => -index))
  })
}

function isPlaylistChanged(prev, next) {
  // The playlist timestamp is ignored in this comparison if it has been
  // set to `null` to prevent unnecessarily loading a batch of playlist
  // items during a move or delete operation. Move and delete responses
  // do not include the updated playlist timestamp, and it is not
  // possible to get that information without a subsequent `loadPlayer`.
  //
  // Controlflow: playlistItem(Moved|Deleted) set timestamp: null >
  // loadPlayer > gotPlayer updates timestamp and does not trigger
  // subsequent loadPlayer effect
  const playlistSig = obj => [
    obj.playerid,
    prev.timestamp === null ? "-" : obj.timestamp,
    obj.numTracks,
  ].join("  ")
  return playlistSig(prev) !== playlistSig(next)
}

/**
 * Merge newly loaded playlist items into existing playlist
 *
 * FIXME returns wrong result if all items in playlist have changed
 * but only a subset is merged.
 *
 * @param newList Array of new playlist items.
 * @param oldList Array of old/existing playlist items.
 * @param key Item index property.
 * @returns Merged Array of playlist items. Old items are discarded if
 * new items are non-contiguous or not overlapping.
 */
export function mergePlaylist(newList, oldList, key=IX) {
  const newLen = newList.length
  if (!newLen) {
    return oldList
  }
  const oldLen = oldList.length
  if (!oldLen
      || oldList[oldLen - 1][key] + 1 < newList[0][key]
      || newList[newLen - 1][key] + 1 < oldList[0][key]) {
    return newList
  }
  let start = 0, stop
  if (newList[0][key] < oldList[0][key]) {
    stop = newLen - (oldList[0][key] - newList[0][key])
  } else {
    start = newList[0][key] - oldList[0][key]
    stop = start + newLen
  }
  return oldList.slice(0, start).concat(newList, oldList.slice(stop))
}

export function loadTrackInfo(trackId) {
  const track = "track_id:" + trackId
  const tags = "tags:aAcCdefgiIjJkKlLmMnopPDUqrROSstTuvwxXyY"
  return lms.command("::", "songinfo", 0, 100, track, tags)
    .then(json => {
      const info = _.reduce(json.data.result.songinfo_loop, _.assign, {})
      // expire in 5 minutes
      info.expirationDate = new Date((new Date()).getTime() + 5 * 60 * 1000)
      return actions.loadedTrackInfo(info)
    })
    .catch(error => operationError("Error loading track info", error))
}

/**
 * Delete item from playlist and re-index other items
 *
 * @param list - Array of playlist items.
 * @param index - Index of item to delete.
 * @returns Array of playlist items.
 */
export function deleteItem(list, index) {
  if (_.find(list, item => item[IX] === index)) {
    return list
      .filter(item => item[IX] !== index)
      .map(item => {
        const ix = item[IX]
        return ix > index ? {...item, [IX]: ix - 1} : item
      })
  }
  return list
}

/**
 * Move item in playlist and re-index other items
 *
 * @param list - Array of playlist items.
 * @param fromIndex - Playlist index of item being moved.
 * @param toIndex - Playlist index to which item is to be moved.
 * @returns Array of playlist items.
 */
export function moveItem(list, fromIndex, toIndex, item) {
  const offset = list[0][IX]
  const fromObj = item || list[fromIndex - offset] || {title: "..."}
  list = list.filter(item => item[IX] !== fromIndex)
  const to = (toIndex > fromIndex ? toIndex - 1 : toIndex) - offset
  if (0 <= to && to <= list.length) {
    list.splice(to, 0, fromObj)
  }
  return list.map((item, i) => (
    item[IX] !== i + offset ? {...item, [IX]: i + offset} : item
  ))
}

export class Playlist extends React.Component {
  static contextType = MenuContext
  constructor(props) {
    super(props)
    this.state = {
      infoIndex: -1,
      prompt: {},
      touching: false,
    }
    this.hideTrackInfo = () => {}
    this.saver = playlistSaver(this.afterSavePlaylist)
    this.loading = new Set()
    this.shouldAutoLoad = false
    this.shouldAutoScroll = true
    this.scrollBehavior = "instant"
    this.scrollTimer = timer()
  }
  componentDidMount() {
    this.context.addKeydownHandler(8 /* backspace */, this.onDeleteItems)
    this.context.addKeydownHandler(46 /* delete */, this.onDeleteItems)
    this.context.addKeydownHandler(13 /* enter */, this.onEnterKey)
  }
  componentDidCatch(error, errorInfo) {
    window.console.error(error, errorInfo)
  }
  setPlayingItem = (ref) => {
    if (this.shouldAutoScroll && ref) {
      setTimeout(() => {
        window.scroll({
          top: ref.offsetTop - ref.clientHeight,
          left: 0,
          behavior: this.scrollBehavior,
        })
        if (!this.shouldAutoLoad) {
          this.scrollBehavior = "smooth"
          setTimeout(() => this.shouldAutoLoad = true, 1000)
        }
      }, 0)
    }
  }
  pauseAutoScroll = (timeout=TWO_MINUTES) => {
    this.shouldAutoScroll = false
    this.scrollTimer.clear()
    this.scrollTimer.after(timeout, () => this.shouldAutoScroll = true)
  }
  playTrackAtIndex = playlistIndex => {
    this.pauseAutoScroll()
    this.command("playlist", "index", playlistIndex)
      .then(() => this.props.dispatch(actions.clearSelection()))
    this.hideTrackInfo()
  }
  setRepeatMode = mode => this.command("playlist", "repeat", mode)
  setShuffleMode = mode => this.command("playlist", "shuffle", mode)
  command = (...args) => this.props.playctl.command(...args)
  onEnterKey = () => {
    if (this.state.prompt.action) {
      this.state.prompt.action()
      this.setState({prompt: {}})
    }
  }
  onTap = item => {
    // HACK hide info icon after touch
    this.onLongTouch(item)
  }
  onLongTouch = item => {
    this.pauseAutoScroll()
    clearTimeout(this.infoTimer)
    // show info icon after selection changes
    setTimeout(() => this.setInfoIndex(item[IX]), 0)
    // hide info icon after short delay
    this.infoTimer = setTimeout(() => this.setInfoIndex(-1), 3000)
    return true
  }
  setInfoIndex(index) {
    if (this.state.infoIndex !== index) {
      this.setState({infoIndex: index})
    }
  }
  onMoveItems = (selection, toIndex) => {
    this.pauseAutoScroll()
    const { playerid, dispatch } = this.props
    moveItems(selection, toIndex, playerid, dispatch, lms)
      .then(() => loadPlayer(playerid))
      .catch(err => operationError("Move error", err))
      .then(dispatch)
  }
  onDeleteItems = () => {
    const number = this.props.selection.size
    let prompt
    if (number) {
      prompt = "Delete " + number + " song" + (number > 1 ? "s" : "")
    } else {
      prompt = "Clear playlist"
    }
    this.setState({prompt: {
      content: prompt + "?",
      yesText: (prompt || "").replace(/ .*$/, ""),
      action: this.deleteItems,
    }})
  }
  deleteItems = () => {
    const { playerid, dispatch, selection } = this.props
    this.setState({prompt: {}})
    if (selection.size) {
      deleteSelection(playerid, selection, dispatch, lms)
        .then(() => loadPlayer(playerid))
        .catch(err => operationError("Delete error", err))
        .then(dispatch)
    } else {
      lms.command(playerid, "playlist", "clear")
        .then(() => loadPlayer(playerid))
        .catch(err => operationError("Cannot clear playlist", err))
        .then(dispatch)
    }
  }
  onSavePlaylist() {
    this.saver.load(this.props.playerid, prompt => {
      this.setState({prompt})
    })
  }
  afterSavePlaylist = () => {
    this.setState({prompt: {}})
  }
  onDrop = (data, dataType, index) => {
    if (dataType === MEDIA_ITEMS) {
      this.pauseAutoScroll()
      const { items, params=[] } = data
      const {playerid, dispatch, numTracks} = this.props
      insertPlaylistItems(playerid, items, params, index, dispatch, numTracks)
    }
  }
  onSelectionChanged = (selection, isTouch) => {
    this.props.dispatch(actions.selectionChanged(selection))
    this.setInfoIndex(-1)
    this.hideTrackInfo()
    this.setState({touching: selection.size && isTouch})
    this.pauseAutoScroll()
  }
  onLoadItems = (range) => {
    const key = JSON.stringify(range)
    if (!this.shouldAutoLoad || !range || this.loading.has(key)) {
      return
    }
    this.loading.add(key)
    const { playerid, dispatch } = this.props
    return loadPlayer(playerid, range)
      .then(dispatch)
      .then(() => this.loading.delete(key))
  }
  setHideTrackInfoCallback = callback => {
    this.hideTrackInfo = callback
  }
  DROP_TYPES = [MEDIA_ITEMS]
  render() {
    const props = this.props
    const playctl = props.playctl
    return <PlaylistRoot>
      <TouchList
          items={props.items}
          itemsOffset={props.numTracks ? props.items[0][IX] : 0}
          itemsTotal={props.numTracks}
          selection={props.selection}
          dropTypes={this.DROP_TYPES}
          onDrop={this.onDrop}
          onTap={this.onTap}
          onLongTouch={this.onLongTouch}
          onMoveItems={this.onMoveItems}
          onSelectionChanged={this.onSelectionChanged}
          onLoadItems={this.onLoadItems}>
        {props.items.map(item => {
          return <PlaylistItem
            item={item}
            playTrackAtIndex={this.playTrackAtIndex}
            index={item[IX]}
            activeIcon={props.currentIndex === item[IX] ? PlayCircleRounded : null}
            setItemRef={props.currentIndex === item[IX] && this.setPlayingItem}
            touching={!!(this.state.touching && props.selection.has(item[IX]))}
            setHideTrackInfoCallback={this.setHideTrackInfoCallback}
            showInfoIcon={item[IX] === this.state.infoIndex}
            fullTrackInfo={props.fullTrackInfo}
            history={props.history}
            location={props.location}
            dispatch={props.dispatch}
            key={objectId(item)}
          />
        })}
      </TouchList>
      <MediaQuery down="sm">{ smallScreen =>
        <ActionMenu
          playctl={playctl}
          smallScreen={smallScreen}
          miniPlayer={props.miniPlayer}
          repeatMode={props.repeatMode}
          shuffleMode={props.shuffleMode}
          setRepeatMode={this.setRepeatMode}
          setShuffleMode={this.setShuffleMode}
          onSavePlaylist={() => this.onSavePlaylist()}
          onDeleteItems={() => this.onDeleteItems()}
          hasSelection={props.selection.size > 0}
          playerid={props.playerid}
        />
      }</MediaQuery>
      <Dialog
        open={Boolean(this.state.prompt.action)}
        onClose={() => this.setState({prompt: {}})}
      >
        <DialogContent>{this.state.prompt.content}</DialogContent>
        <DialogActions>
          <Button onClick={() => this.setState({prompt: {}})}>Cancel</Button>
          <Button onClick={this.state.prompt.action} color="primary">
            {this.state.prompt.yesText}
          </Button>
        </DialogActions>
      </Dialog>
    </PlaylistRoot>
  }
}

const PlaylistRoot = styled('div')({
  marginBottom: '4em',  // make room for floating action menu below playlist
})

const ActionMenu = ({
  playctl, smallScreen, miniPlayer, repeatMode, shuffleMode, setRepeatMode, setShuffleMode,
  onSavePlaylist, onDeleteItems, hasSelection, playerid,
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null)
  const close = () => setAnchorEl(null)
  return (
    <>
      <IconButton
        onClick={event => setAnchorEl(event.currentTarget)}
        sx={{
          position: 'fixed',
          right: '0.7em',
          bottom: smallScreen && miniPlayer ? `calc(${TOOLBAR_HEIGHT} + 0.7em)` : '0.7em',
          zIndex: 100,
        }}
      >
        <MenuRounded />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={close}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { onSavePlaylist(); close() }}>
          <SaveRounded fontSize="small" sx={{ marginRight: 1 }} />
          Save Playlist
        </MenuItem>
        <MenuItem onClick={() => { onDeleteItems(); close() }}>
          <DeleteRounded fontSize="small" sx={{ marginRight: 1 }} />
          {hasSelection ? "Delete" : "Clear Playlist"}
        </MenuItem>
        <Box sx={{ paddingX: 2, paddingY: 1 }}>
          <RepeatShuffleGroup
            repeatMode={repeatMode}
            setRepeatMode={setRepeatMode}
            shuffleMode={shuffleMode}
            setShuffleMode={setShuffleMode}
            disabled={!playerid}
            fullWidth
          />
        </Box>
        <MediaQuery down="sm">{ narrow => narrow ?
          <ButtonGroup sx={{ paddingX: 2, paddingY: 1 }} size="small" fullWidth>
            <Button onClick={playctl.prevTrack}>
              <FastRewindRounded fontSize="small" />
            </Button>
            <Button onClick={playctl.nextTrack}>
              <FastForwardRounded fontSize="small" />
            </Button>
          </ButtonGroup>
        : null }</MediaQuery>
      </Menu>
    </>
  )
}

export class PlaylistItem extends React.Component {
  constructor(props) {
    super(props)
    this.state = {expanded: false}
  }
  shouldComponentUpdate(props, state) {
    // Need this because props.item is always a new object
    const old = this.props
    return (
      this.state.expanded !== state.expanded ||
      old.index !== props.index ||
      old.item.id !== props.item.id ||
      old.touching !== props.touching ||
      old.activeIcon !== props.activeIcon ||
      old.setItemRef !== props.setItemRef ||
      old.showInfoIcon !== props.showInfoIcon ||
      old.fullTrackInfo[old.item.id] !== props.fullTrackInfo[props.item.id]
    )
  }
  onToggleInfo = event => {
    this.setState((state, props) => {
      state = _.clone(state)
      state.expanded = !state.expanded
      if (state.expanded) {
        const info = props.fullTrackInfo[props.item.id]
        if (!info || info.expirationDate < new Date()) {
          loadTrackInfo(props.item.id).then(props.dispatch)
        }
      }
      return state
    })
    event.stopPropagation()
  }
  onCollapseInfo = event => {
    if (this.state.expanded) {
      this.setState({expanded: false})
    }
    event.stopPropagation()
  }
  playTrack = () => {
    this.props.playTrackAtIndex(this.props.item[IX])
  }
  smallStyle = {height: 32}
  noStyle = {}
  render() {
    const props = this.props
    const item = props.item
    const info = props.fullTrackInfo[item.id]
    return <MediaQuery down="sm">{ smallScreen => {
      const heightStyle = smallScreen ? this.smallStyle : this.noStyle
      return <TouchList.Item
        index={props.index}
        onDoubleClick={this.playTrack}
        setItemRef={props.setItemRef}
        draggable
      >
        <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0, ...heightStyle }}>
          <Box sx={{
            flex: '1 1 auto',
            minWidth: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            <Box component="span" sx={{ marginRight: smallScreen ? 0 : 0.5 }}>
              <TrackInfoIcon
                item={item}
                activeIcon={props.activeIcon}
                showInfoIcon={props.showInfoIcon}
                onClick={this.onToggleInfo}
                smallScreen={smallScreen}
              />
            </Box>
            <SongTitle item={item} smallScreen={smallScreen} />
          </Box>
          <Box
            className={props.touching ? "drag-handle" : ""}
            sx={{ flex: '0 0 auto', marginLeft: 1 }}
          >
            {formatTime(item.duration || 0)}
            {props.touching ? <DragHandle /> : ""}
          </Box>
        </Box>
        { this.state.expanded ?
          <Paper
            variant="outlined"
            className="tap-zone no-drag"
            onClick={event => event.stopPropagation()}
            onDoubleClick={event => event.stopPropagation() && false}
            sx={{ padding: 1, marginTop: 1 }}
          >
            <MediaInfo
              item={info || item}
              isLoading={!info}
              button={
                <IconButton onClick={this.playTrack} size="small">
                  <PlayArrowRounded fontSize="small" />
                </IconButton>
              }
              onClose={this.onCollapseInfo}
            />
          </Paper> : null
        }
      </TouchList.Item>
    }}</MediaQuery>
  }
}

const SongTitle = ({item, smallScreen}) => {
  const {artist, title, tracknum} = item
  const track = tracknum ? <Box component="span" sx={{ opacity: 0.44 }}>{tracknum + " "}</Box> : ""
  if (smallScreen) {
    return <div>
      <div>{track}{title}</div>
      <Box sx={{ opacity: 0.44 }}>{artist}</Box>
    </div>
  }
  const spacer = artist && (tracknum || title) ? " - " : ""
  return <span>
    <span>{artist + spacer}</span>
    {track}
    <span>{title}</span>
  </span>
}


function playlistSaver(afterSave) {
  function handleInputRef(ref) {
    state.inputRef = ref
    focus()
  }
  function focus() {
    if (state.inputRef) {
      if (state.savedName) {
        state.inputRef.value = state.name = state.savedName
        state.inputRef.select()
        state.savedName = ""
      }
      state.inputRef.focus()
    }
  }
  function load(playerid, callback) {
    state.playerid = playerid
    lms.command(playerid, "playlist", "name", "?").then(({data}) => {
      state.savedName = data ? data.result._name || "" : ""
      callback({
        content: input,
        yesText: "Save",
        action: savePlaylist,
      })
      focus()
    })
  }
  function savePlaylist() {
    lms.command(state.playerid, "playlist", "save", state.name)
    afterSave()
  }
  const state = {inputRef: null, name: "", savedName: ""}
  const input = <TextField
    label="Save as"
    onChange={event => { state.name = event.target.value }}
    inputRef={handleInputRef}
    fullWidth
    autoFocus
    variant="standard"
  />
  return {load}
}
