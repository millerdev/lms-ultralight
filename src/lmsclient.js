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
  return exec(playerid, ["status", index, qty, "tags:aludcJK"]).then(({data}) => {
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
