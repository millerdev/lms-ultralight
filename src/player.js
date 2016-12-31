import { List, Map, fromJS } from 'immutable'
import _ from 'lodash'
import React from 'react'
import { connect } from 'react-redux'
import { Button, Dropdown, Item } from 'semantic-ui-react'

import makeReducer from './store'
import * as lms from './lmsclient'

export const defaultState = Map({
  players: List(),
  playersLoading: false,
  playersError: false,
  playerid: null,
  isPowerOn: false,
  isPlaying: false,
  trackInfo: Map(),
})

export function init() {
  const playerid = localStorage.currentPlayer
  lms.getPlayers().then(response => {
    const players = response.data
    actions.gotPlayers(players)
    if (playerid && _.some(players, item => item.playerid === playerid)) {
      loadPlayer(playerid)
    } else if (players.length) {
      loadPlayer(players[0].playerid)
    }
  })
}

function playerCommand(playerid, ...command) {
  lms.playerCommand(playerid, ...command).then(() => loadPlayer(playerid))
}

function loadPlayer(playerid) {
  localStorage.currentPlayer = playerid
  lms.getPlayerStatus(playerid).then(response => {
    actions.gotPlayer(response.data)
  }).catch(() => {
    actions.gotPlayer()
  })
}

export const reducer = makeReducer({
  loadPlayers: state => {
    lms.getPlayers().then(response => {
      actions.gotPlayers(response.data)
    }).catch(() => {
      actions.gotPlayers()
    })
    return state.set('playersLoading', true)
  },
  gotPlayers: (state, action) => (
    state.withMutations(map => {
      const players = action.payload
      map
        .set('playersError', !players)
        .set('playersLoading', false)
      if (players) {
        const keeps = ["name", "playerid"]
        map.set('players', fromJS(_.map(players, item => _.pick(item, keeps))))
      }
    })
  ),
  gotPlayer: (state, action) => {
    const obj = action.payload
    return state.merge({
      playerid: obj.playerid,
      isPowerOn: obj.power === 1,
      isPlaying: obj.mode === "play",
      trackInfo: fromJS(obj.playlist_loop[0] || {}),
    })
  },
}, defaultState)

const actions = reducer.actions

const IconToggleButton = props => (
  <Button
    onClick={props.onClick}
    icon={props.isOn() ? props.iconOff : props.iconOn}
    disabled={props.disabled}
    />
)

const CurrentTrackInfo = props => (
  <Item.Group>
    <Item>
      <Item.Image size="tiny" src={lms.getImageUrl(props.playerid)} />
      <Item.Content>
        <Item.Header>{props.tags.title}</Item.Header>
        <Item.Meta>{props.tags.artist}</Item.Meta>
        <Item.Meta>{props.tags.album}</Item.Meta>
      </Item.Content>
    </Item>
  </Item.Group>
)

const onLoadPlayers = _.throttle(actions.loadPlayers, 30000, {trailing: false})

export const Player = props => (
  <div>
    <div>
      <Dropdown
        placeholder="Select Player"
        onClick={onLoadPlayers}
        onChange={(e, { value }) => loadPlayer(value)}
        options={props.players.map(item => ({
          text: item.get("name"),
          value: item.get("playerid"),
        })).toJS()}
        value={props.playerid || ""}
        loading={props.playersLoading}
        error={props.playersError}
        selection />
    </div>
    <div>
      <Button.Group basic size="small">
        <Button
          icon="backward"
          onClick={() => playerCommand(props.playerid, "playlist", "index", "-1")}
          disabled={!props.playerid} />
        <IconToggleButton
          isOn={() => props.isPlaying}
          onClick={() =>
            playerCommand(props.playerid, props.isPlaying ? "pause" : "play")}
          iconOn="play"
          iconOff="pause"
          disabled={!props.playerid} />
        <Button
          icon="forward"
          onClick={() => playerCommand(props.playerid, "playlist", "index", "+1")}
          disabled={!props.playerid} />
      </Button.Group>
      {/*
      <Button.Group basic size="small">
        <Button icon="repeat" disabled={!props.playerid} />
        <Button icon="shuffle" disabled={!props.playerid} />
      </Button.Group>
      */}
      <Button.Group basic size="small">
        <Button basic toggle
          active={props.isPowerOn}
          onClick={() =>
            playerCommand(props.playerid, "power", props.isPowerOn ? 0 : 1)}
          icon="power"
          disabled={!props.playerid} />
      </Button.Group>
    </div>
    <CurrentTrackInfo
      playerid={props.playerid}
      tags={props.trackInfo.toObject()}
      disabled={!props.playerid} />
  </div>
)

function mapStateToProps(state) {
  return state.toObject()
}

export default connect(mapStateToProps)(Player)
