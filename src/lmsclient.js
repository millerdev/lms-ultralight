// Logitech Media Server client
import axios from 'axios'
import _ from 'lodash'

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
    return _.extend(data && data.result, {playerid})
  }
  return exec([playerid, "status", index, qty, "tags:aBlu"], transform)
}

export function playerCommand(playerid, ...command) {
  return exec([playerid].concat(command))
}

export function getImageUrl(playerid, trackid="current") {
  return axios.defaults.baseURL + "/music/" + trackid + "/cover.jpg?player=" + playerid
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
