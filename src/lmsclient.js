// Logitech Media Server client
import { Map } from 'immutable'
import axios from 'axios'
import _ from 'lodash'

import { makeActor } from './store'
import { isNumeric } from './util'

const STATUS_INTERVAL = 30

const gotPlayer = makeActor("gotPlayer")
const updatePlayerTime = makeActor("updatePlayerTime")

export function loadPlayer(playerid, updatePlaylist=false) {
  const args = updatePlaylist ? [0, 100] : []
  getPlayerStatus(playerid, ...args).then(({data}) => {
    gotPlayer(data)
    recurringPlayerUpdate(playerid, data, updatePlaylist)
  }).catch((err) => {
    window.console.error(err)
  })
}

let timers = []
let currentPlaylistID = null

function addTimer(id) {
  timers.push(id)
}

function clearTimers() {
  let temp
  [timers, temp] = [[], timers]
  _.each(temp, id => clearTimeout(id))
}

function recurringPlayerUpdate(playerid, data) {
  /*
    TODO
    - move player selector and playlist into Player
    - move recurring play time updates into LiveSeekBar
      - use playlist and local time to calculate current song/play time
      - don't forget to check repeat-one when advancing to next song
      - all live updates are local to LiveSeekBar and do not change app state
    - make a `timer` object that can be faked for testing
      - timer.timeout(ms, func)
      - timer.interval(ms, func)
      - timer.clear()
      - pass fake timer to LiveSeekBar in tests
    - request updates from server on periodic basis (slower in dev mode)
      - allow force update if isPlaying and beyond end of current playlist
   */
  clearTimers()
  let elapsed = isNumeric(data.time) ? data.time : 0
  const total = data.total
  const isPlaying = data.mode === "play"
  const playlistID = Map({
    playerid,
    timestamp: data.playlist_timestamp,
    tracks: data.playlist_tracks,
  })
  const updatePlaylist = !data.isPlaylistUpdate && !playlistID.equals(currentPlaylistID)
  if (data.isPlaylistUpdate) {
    currentPlaylistID = playlistID
  }

  // load player again after STATUS_INTERVAL or end of song, whichever is first
  let nextLoad = total ? total - elapsed : STATUS_INTERVAL
  if (updatePlaylist) {
    currentPlaylistID = playlistID
    nextLoad = 0.1
  } else if (nextLoad > STATUS_INTERVAL || !isPlaying) {
    nextLoad = STATUS_INTERVAL
  } else {
    // add small amount to update after end of song
    nextLoad += 1
  }
  addTimer(setTimeout(function () {
    loadPlayer(playerid, updatePlaylist)
  }, nextLoad * 1000))

  if (isPlaying) {
    const wait = Math.round((1 - elapsed % 1) * 1000)
    elapsed = Math.ceil(elapsed)
    // wait for a fraction of second to sync with play timer
    addTimer(setTimeout(function () {
      updatePlayerTime(elapsed)
      // update play time every second
      addTimer(setInterval(function () {
        elapsed += 1
        if (total === undefined || elapsed <= total) {
          updatePlayerTime(elapsed)
        }
      }, 1000))
    }, wait))
  }
}

export function getPlayers(index=0, qty=999) {
  function transform(data) {
    data = JSON.parse(data)
    return data && data.result ? data.result.players_loop : []
  }
  return exec(["", "serverstatus", index, qty], transform)
}

export function getPlayerStatus(playerid, index="-", qty=1) {
  function transform(data) {
    data = JSON.parse(data)
    const after = new Date()
    const localTime = new Date(before.getTime() + (after - before) / 2)
    const isPlaylistUpdate = index !== "-"
    return _.extend(data && data.result, {
      playerid,
      isPlaylistUpdate,
      localTime,
    })
  }
  const before = new Date()
  return exec([playerid, "status", index, qty, "tags:aBluJ"], transform)
}

export function command(playerid, ...command) {
  exec([playerid].concat(command)).then(() => loadPlayer(playerid))
}

export function getImageUrl(playerid, tags, current=false) {
  const trackid = current ? "current" : tags.artwork_track_id
  let cachebuster = ""
  if (current && tags) {
    if (tags.artwork_track_id) {
      cachebuster = "&artwork_track_id=" + tags.artwork_track_id
    } else {
      cachebuster = "&cachebuster=" + encodeURIComponent(
        tags.artist + "-" + tags.album + "-" + tags.title)
    }
  }
  return axios.defaults.baseURL +
    "/music/" + trackid + "/cover.jpg" +
    "?player=" + playerid + cachebuster
}

/**
 * Execute LMS command
 *
 * @param command - array of player id and command/parameters. Example:
 *    ["<pl:ay:er:id:...>", "<command>", params...]
 * @param tranformResponse - (optional) see axios parameter with same name.
 * @returns a promise object.
 *
 * jsonrpc.js request structure:
 *
 *   general command:
 *
 *     {
 *       id: 1,
 *       method: "slim.request",
 *       params: ["", ["<command>", params...]]
 *     }
 *
 *   player command:
 *
 *     {
 *       id: 1,
 *       method: "slim.request",
 *       params: ["<pl:ay:er:id:...>", ["<command>", params...]]
 *     }
 *
 */
function exec(command, transformResponse) {
  const req = {
    method: "post",
    url: "/jsonrpc.js",
    headers: {'Content-Type': 'text/plain'},
    data: {
      id: 1,
      method: "slim.request",
      params: [command[0], command.slice(1)]
    }
  }
  if (transformResponse) {
    req.transformResponse = [transformResponse]
  }
  return axios(req).catch(err => { window.console.error(err) })
}
