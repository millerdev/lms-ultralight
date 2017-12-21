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
    const imageUrl = lms.getImageUrl(props.item)
    if (this.state.isPopped && props.setHideTrackInfoCallback) {
      props.setHideTrackInfoCallback(this.onHide.bind(this))
    }
    return <span className="gap-right">
      <Popup
          trigger={props.showInfoIcon ?
            <Icon
              onClick={this.onClick.bind(this)}
              className="tap-zone"
              name="info circle"
              size="large"
              fitted /> :
            props.activeIcon ?
              <Icon
                onClick={this.onClick.bind(this)}
                className="tap-zone"
                name={props.activeIcon}
                size="large"
                fitted /> :
              <div
                  onClick={this.onClick.bind(this)}
                  className="hover-icon-container">
                <Image src={imageUrl} ui inline height="18px" width="18px"
                  className="tap-zone hover-icon" />
                <div className="middle">
                  <Icon className="tap-zone" name="info circle" size="large" fitted />
                </div>
              </div>
          }
          open={this.state.isPopped}
          onOpen={this.onPop.bind(this)}
          onClose={this.onHide.bind(this)}
          position="right center"
          on="click"
          wide="very">
        <Item.Group>
          <Item>
            <Item.Image size="small" src={imageUrl} />
            <Item.Content>{props.children}</Item.Content>
          </Item>
        </Item.Group>
      </Popup>
    </span>
  }
}
