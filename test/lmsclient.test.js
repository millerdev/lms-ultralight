import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import * as lms from '../src/lmsclient'

describe('lmsclient', function () {
  it('getPlayers should return a list of players', function (done) {
    const mock = new MockAdapter(axios)
    const players = [
      {playerid: "1:1:1:1", name: "One"},
      {playerid: "2:2:2:2", name: "Two"},
    ]
    const resp = {result: {players_loop: players}}
    mock.onPost("/jsonrpc.js").reply(200, JSON.stringify(resp))

    lms.getPlayers().then(response => {
      assert.deepEqual(response.data, players)
    }).then(done, done)
  })
})
