// Logitech Media Server client
import axios from 'axios'
import _ from 'lodash'

export function getPlayers(index=0, qty=999) {
  return exec("", ["serverstatus", index, qty]).then(({data}) => {
    return data && data.result ? data.result.players_loop : []
  })
}

export function getPlayerStatus(playerid, index="-", qty=1) {
  const before = Date.now()
  return exec(playerid, ["status", index, qty, "tags:aludJ"]).then(({data}) => {
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
