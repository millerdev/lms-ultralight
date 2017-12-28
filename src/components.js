import React from 'react'
import { Icon, Image, Item, Popup } from 'semantic-ui-react'

import * as lms from './lmsclient'
import './components.styl'


export class TrackInfoPopup extends React.Component {
  constructor(props) {
    super(props)
    this.state = {isPopped: false}
  }
  onPop() {
    !this.state.isPopped && this.setState({isPopped: true})
  }
  onHide() {
    this.state.isPopped && this.setState({isPopped: false})
  }
  onClick(event) {
    this.setState(state => { return {isPopped: !state.isPopped} })
    event.stopPropagation()
  }
  render() {
    const props = this.props
    if (this.state.isPopped && props.setHideTrackInfoCallback) {
      props.setHideTrackInfoCallback(this.onHide.bind(this))
    }
    return <span className="gap-right">
      <Popup
          trigger={<TrackInfoIcon {...props} onClick={this.onClick.bind(this)} />}
          open={this.state.isPopped}
          onOpen={this.onPop.bind(this)}
          onClose={this.onHide.bind(this)}
          position="right center"
          on="click"
          wide="very">
        <Item.Group>
          <Item>
            <Item.Image size="small" src={lms.getImageUrl(props.item)} />
            <Item.Content>{props.children}</Item.Content>
          </Item>
        </Item.Group>
      </Popup>
    </span>
  }
}

export const TrackInfoIcon = props => {
  if (props.showInfoIcon) {
    return <Icon
      onClick={props.onClick}
      className="tap-zone"
      name="info circle"
      size="large"
      fitted />
  } else if (props.activeIcon) {
    return <Icon
      onClick={props.onClick}
      className="tap-zone"
      name={props.activeIcon}
      size="large"
      fitted />
  }
  return <div
      onClick={props.onClick}
      className="hover-icon-container">
    <Image
      src={lms.getImageUrl(props.item)}
      className="tap-zone hover-icon"
      height="18px"
      width="18px"
      ui inline />
    <div className="middle">
      <Icon className="tap-zone" name="info circle" size="large" fitted />
    </div>
  </div>
}

export const DragHandle = () => (
  <span className="gap-left">
    <Icon name="content" fitted />
  </span>
)
