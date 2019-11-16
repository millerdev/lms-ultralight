// Logitech Media Server client
import axios from 'axios'
import _ from 'lodash'

import { operationError } from './util'

export function getPlayers(index=0, qty=999) {
  return exec("", ["serverstatus", index, qty]).then(({data}) => {
    return data && data.result ? data.result.players_loop : []
  })
}

export function getPlayerStatus(playerid, index="-", qty=1) {
  const before = Date.now()
  return exec(playerid, ["status", index, qty, "tags:altsedcJK"]).then(({data}) => {
    const after = Date.now()
    return _.extend(data.result, {
      playerid,
      isPlaylistUpdate: index !== "-",
      localTime: before + (after - before) / 2,
    })
  })
}

export function command(playerid, ...command) {
  return exec(playerid, command)
}

export function getImageUrl(tags, playerid) {
  if (tags.artwork_url) {
    return tags.artwork_url
  }
  let coverid = "unknown"
  let querystring = ""
  if (tags.coverid) {
    coverid = tags.coverid
  } else if (tags.artwork_track_id) {
    coverid = tags.artwork_track_id
  } else if (tags.artwork) {
    coverid = tags.artwork
  }
  if (playerid) {
    querystring = "?player=" + playerid + "&cachebuster=" +
      (coverid !== "unknown" ? coverid :
        encodeURIComponent(tags.artist + "-" + tags.album + "-" + tags.title))
    coverid = "current"
  }
  return axios.defaults.baseURL +
    "/music/" + coverid + "/cover.jpg" + querystring
}

/**
 * Execute LMS command
 *
 * @param playerid - player id
 * @param command - array of player id and command/parameters. Example:
 *    ["<command>", params...]
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
 *       params: [playerid, ["<command>", params...]]
 *     }
 *
 */
function exec(playerid, command) {
  return axios({
    method: "post",
    url: "/jsonrpc.js",
    headers: {'Content-Type': 'text/plain'},
    data: {
      id: 1,
      method: "slim.request",
      params: [playerid, command]
    }
  }).catch(err => {
    window.console.error(err)
    throw err
  })
}

/**
 * Execute playlist control command
 *
 * @param playerid
 * @param cmd - One of "load", "insert", or "add".
 * @param item - Search result object with "type".
 * @param dispatch - Redux dispatch function.
 * @returns A promise that resolves with a result of `true` if the
 *  action succeeded, else `false`.
 */
export function playlistControl(playerid, cmd, item, dispatch) {
  const loadPlayer = require("./player").loadPlayer
  const error = operationError("Cannot " + cmd + " " + item[item.type])
  const param = getControlParam(item)
  if (param) {
    return command(playerid, "playlistcontrol", "cmd:" + cmd, param)
      .then(() => loadPlayer(playerid, true))
      .catch(() => error)
      .then(action => {
        dispatch(action)
        return action !== error
      })
  } else {
    return new Promise(resolve => {
      dispatch(error)
      resolve(false)
    })
  }
}

export function getControlParam(item) {
  const key = item.type + "_id"
  return _.has(PLAYLISTCONTROL_TAGS, key) && item.id !== undefined ?
    PLAYLISTCONTROL_TAGS[key] + ":" + item.id :
    null
}

const PLAYLISTCONTROL_TAGS = {
  "album_id": "album_id",
  "artist_id": "artist_id",
  "contributor_id": "artist_id",  // this one is different
  "folder_id": "folder_id",
  "genre_id": "genre_id",
  "playlist_id": "playlist_id",
  "playlist_index": "playlist_index",
  "playlist_name": "playlist_name",
  "track_id": "track_id",
  "year": "year",
  "year_id": "year_id",
}
