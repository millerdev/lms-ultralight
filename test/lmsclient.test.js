import axios from 'axios'
import MockAdapter from 'axios-mock-adapter'

import * as lms from '../src/lmsclient'

describe('lmsclient', function () {
  const mock = new MockAdapter(axios)
  afterEach(function () {
    mock.reset()
  })

  it('getPlayers should return a list of players', function (done) {
    const players = [
      {playerid: "1:1:1:1", name: "One"},
      {playerid: "2:2:2:2", name: "Two"},
    ]
    const resp = {result: {players_loop: players}}
    mock.onPost("/jsonrpc.js").reply(200, JSON.stringify(resp))
    lms.getPlayers().then(data => {
      assert.deepEqual(data, players)
    }).then(done, done)
  })

  it('getPlayerStatus should return player status with playerid', function (done) {
    const status = PLAYER_STATUS
    const before = Date.now()
    mock.onPost("/jsonrpc.js").reply(200, JSON.stringify({result: status}))
    lms.getPlayerStatus("<id>").then(data => {
      assert.deepEqual(data, {
        ...status,
        playerid: "<id>",
        localTime: data.localTime,
      })
      assert.typeOf(data.localTime, "Number")
      assert.isAtLeast(data.localTime, before)
      assert.isAtMost(data.localTime, Date.now())
    }).then(done, done)
  })
})

const PLAYER_STATUS = {
  "can_seek": 1,
  "digital_volume_control": 1,
  "duration": 371.373,
  "mixer bass": "0",
  "mixer treble": "0",
  "mixer volume": 15,
  "mode": "stop",
  "player_connected": 1,
  "player_ip": "10.2.1.109:29333",
  "player_name": "Squeezebox",
  "playlist mode": "off",
  "playlist repeat": 2,
  "playlist shuffle": 1,
  "playlist_cur_index": "2",
  "playlist_loop": [
    {
      "url": "file:///.../Vangelis%20-%20Direct/03%20Metallic%20Rain.flac",
      "playlist index": 2,
      "title": "Metallic Rain",
      "id": 30349,
    },
  ],
  "playlist_timestamp": 1482495558.93241,
  "playlist_tracks": 25,
  "power": 0,
  "rate": 1,
  "seq_no": 0,
  "signalstrength": 81,
  "time": 232.467967245102,
  "isPlaylistUpdate": false,
}
