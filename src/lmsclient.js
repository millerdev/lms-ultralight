// Logitech Media Server client
import axios from 'axios'

axios.defaults.baseURL = 'http://10.2.1.2:9000' // TODO remove this

export function getPlayers(index=0, qty=999) {
  function transform(data) {
    data = JSON.parse(data)
    return data && data.result ? data.result.players_loop : []
  }
  return exec(["", "serverstatus", index, qty], transform)
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
