import { List as IList, Seq, Set } from 'immutable'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import { List } from 'semantic-ui-react'

import './touch.styl'

export const SINGLE = "single"
export const TO_LAST = "to last"

/**
 * Touch-interactive list supporting selection and drag/drop
 *
 * Important props:
 * - items: `List` of items, which will be serialized in drag/drop
 *   operations. Each item in this list should correspond to a
 *   `TouchList.Item` with the same `index`.
 * - dropTypes: Array of data types that can be dropped in this list.
 *   Dropping is not supported if this prop is not provided.
 * - onDrop: Callback function for handling dropped content.
 *   Signature: `onDrop(event, index)`
 * - onLongTouch: Callback function for handling long-touch event.
 *   Signature: `onLongTouch(item, index)`
 * - onMoveItems: Callback function for handling drag/drop movement
 *   (sorting) of items within the list. Sorting will be disabled if
 *   this prop is not provided.
 *   Signature: `onMoveItems(fromIndex, toIndex, selectedIndexesArray)`
 */
export class TouchList extends React.Component {
  constructor(props) {
    super(props)
    this.id = _.uniqueId("touch-list-")
    this.state = {
      dropIndex: -1,
      selection: Set(),
      lastSelected: IList(),
    }
    this.slide = makeSlider(this)
  }
  componentDidMount() {
    this.slide.setTouchHandlers(ReactDOM.findDOMNode(this))
  }
  componentWillReceiveProps(props) {
    if (!props.items) {
      throw new Error("TouchList.props.items must be an indexed collection")
    }
    if (!this.props.items || !this.props.items.equals(props.items)) {
      // TODO option to preserve selection if items have been rearranged
      // This will be necessary for the playlist.
      this.setState({selection: Set(), lastSelected: IList()})
    }
  }
  componentWillUnmount() {
    this.slide.setTouchHandlers(null)
  }
  getChildContext() {
    return {
      TouchList_dropIndex: this.state.dropIndex,
      TouchList_selection: this.state.selection,
      TouchList_onItemSelected: this.onItemSelected.bind(this),
      TouchList_slide: this.slide,
    }
  }
  getDragData(index) {
    const items = this.props.items
    let selected
    if (this.state.selection.has(index)) {
      selected = this.state.selection
        .valueSeq()
        .sort()
        .map(index => items.get(index).toObject())
        .toList()
    } else {
      selected = IList([items.get(index).toObject()])
    }
    return JSON.stringify(selected.toArray())
  }
  canDrop(dataTypes) {
    const allowedTypes = this.props.dropTypes
    if (allowedTypes) {
      dataTypes = Set(dataTypes)
      return Seq(allowedTypes).some(value => dataTypes.has(value))
    }
    return false
  }
  onItemSelected(index, modifier) {
    if (!modifier) {
      this.setState({
        selection: Set([index]),
        lastSelected: IList([index]),
      })
      return
    }
    this.setState(state => {
      let selection = state.selection
      let last = state.lastSelected
      if (modifier === SINGLE) {
        if (!selection.has(index)) {
          selection = selection.add(index)
          last = last.push(index)
        } else {
          selection = selection.remove(index)
          if (last.last() === index) {
            last = last.pop()
          }
        }
      } else if (modifier === TO_LAST) {
        const from = last.last() || 0
        const step = from <= index ? 1 : -1
        selection = selection.union(Range(from, index + step, step))
        last = last.push(index)
      }
      return {selection: selection, lastSelected: last}
    })
  }
  onLongTouch(index) {
    if (this.props.onLongTouch) {
      const item = this.props.items.get(index)
      this.props.onLongTouch(item && item.toObject(), index)
    } else {
      this.toggleSelection(index)
    }
  }
  toggleSelection(index) {
    this.onItemSelected(index, SINGLE)
  }
  touchClearSelection() {
    this.setState({selection: Set(), lastSelected: IList()})
  }
  render() {
    const props = this.props
    const others = excludeKeys(props, TOUCHLIST_PROPS, "TouchList")
    if (props.className) {
      others.className = "touchlist " + props.className
    } else {
      others.className = "touchlist"
    }
    return <List {...others}>{props.children}</List>
  }
}

TouchList.childContextTypes = {
  TouchList_dropIndex: PropTypes.number.isRequired,
  TouchList_selection: PropTypes.object.isRequired,
  TouchList_onItemSelected: PropTypes.func.isRequired,
  TouchList_slide: PropTypes.object.isRequired,
}

const TOUCHLIST_PROPS = {
  items: true,
  children: true,
  dataType: true,
  dropTypes: true,
  onDrop: true,
  onLongTouch: true,
  onMoveItems: true,
}

/**
 * Item component for TouchList
 *
 * Important props:
 * - index: required unique/consecutive index for this item.
 */
const TouchListItem = (props, context) => {
  if (!props.hasOwnProperty("index")) {
    throw new Error("`TouchList.Item` `props.index` is required")
  }
  const passProps = excludeKeys(props, TOUCHLISTITEM_PROPS, "TouchList.Item")
  const slide = context.TouchList_slide
  const index = props.index
  const dropClass = index === context.TouchList_dropIndex - 1 ? "dropAfter" :
                    index === context.TouchList_dropIndex ? "dropBefore" : null
  if (!props.hasOwnProperty("onContextMenu")) {
    passProps.onContextMenu = event => event.preventDefault()
  }
  return <List.Item
      onClick={event => {
        const modifier = event.metaKey || event.ctrlKey ? SINGLE :
          (event.shiftKey ? TO_LAST : null)
        context.TouchList_onItemSelected(index, modifier)
      }}
      onDragStart={event => slide.dragStart(event, index)}
      onDragOver={event => slide.dragOver(event, index)}
      onDrop={event => slide.drop(event, index)}
      onDragEnd={slide.dragEnd}
      className={_.filter([
        "touchlist-item",
        context.TouchList_selection.has(index) ? "selected" : "",
        dropClass,
        props.className
      ]).join(" ")}
      draggable
      {...passProps}>
    {props.children}
  </List.Item>
}

const TOUCHLISTITEM_PROPS = {
  index: true,
  children: true,
  onClick: false,
  onDragStart: false,
  onDragOver: false,
  onDrop: false,
  onDragEnd: false,
  className: true,
  "data-touchlist-item-index": false,
}

TouchList.Item = TouchListItem

TouchListItem.contextTypes = {
  TouchList_dropIndex: PropTypes.number.isRequired,
  TouchList_selection: PropTypes.object.isRequired,
  TouchList_onItemSelected: PropTypes.func.isRequired,
  TouchList_slide: PropTypes.object.isRequired,
}

/**
 * Create a new object excluding keys from the source object
 *
 * @param src - The source object.
 * @param keys - An object whose members should be excluded. An error
 *    will be thrown if any value returned by `_.get(keys, key)` returns
 *    a falsy value and the source object has such a key.
 */
const excludeKeys = (src, keys, for_) => _.pickBy(src, (value, key) => {
  if (!_.has(keys, key)) {
    return true
  } else if (!_.get(keys, key)) {
    throw new Error("cannot override " + for_ + " " + key)
  }
}, {})

/**
 * List touch interaction and drag/drop manager
 *
 * Mouse interaction
 *  - click to select
 *  - ctrl/shift+click to select/deselect multiple
 *  - drag/drop to rearrange items in list (if onMoveItems provided)
 *
 * Touch interaction:
 *  - tappable reigions (class="tappable")
 *    - event prop: onTap={callback}
 *  - tap to select and enter selection/reorder mode
 *    - tap to select/deselect items
 *      - event prop: onSelect
 *        - returns: boolean - true to enter multi-select mode
 *    - drag on drag handle to rearrange items in list
 *    - long-press+drag to select and rearrange item(s) in list
 *    - long-press selected item to exit selection mode
 *    - tap/deselect last selected item to exit selection mode
 *  - TODO swipe to enter delete mode
 *    - click delete icon on right to confirm deletion
 *  - TODO long-press to view track details
 */
function makeSlider(touchlist) {
  let listeners = []
  let fromIndex = -1
  let holdTimer = null
  let isHolding = false
  let startPosition = null
  let latestPosition = null

  function setTouchHandlers(el) {
    if (el) {
      listeners = [
        addEventListener(el, 'touchstart', touchStart),
        addEventListener(el, 'touchmove', touchMove, {passive: false}),
        addEventListener(el, 'touchend', touchEnd),
      ]
    } else {
      while (listeners.length) { listeners.pop()() }
    }
  }
  function addEventListener(el, name, handler, options) {
    el.addEventListener(name, handler, options)
    return () => el.removeEventListener(name, handler, options)
  } 

  function touchStart(event) {
    if (event.touches.length > 1) {
      return
    }
    const pos = startPosition = latestPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      time: event.timeStamp,
    }
    const target = getTarget(pos)
    fromIndex = getIndex(target)
    const isDragHandle = hasClass(target, "drag-handle")
    const isSelected = touchlist.state.selection.has(fromIndex)
    isHolding = false
    holdTimer = setTimeout(() => {
      isHolding = true
      if (startPosition === latestPosition && !isDragHandle) {
        if (isSelected && touchlist.state.selection.size) {
          touchlist.touchClearSelection()
          isHolding = false
          latestPosition = null  // do nothing on touchEnd
        } else {
          // TODO show track info instead of select
          touchlist.onLongTouch(fromIndex)
        }
      }
    }, 300)
  }
  function touchMove(event) {
    cancelHold()
    const pos = latestPosition = {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      time: event.timeStamp,
    }
    const target = getTarget(pos)
    if (isHolding || hasClass(target, "drag-handle")) {
      event.preventDefault()
      if (pos.time - startPosition.time > 330) {
        const hoverIndex = getIndex(target)
        if (hoverIndex !== null) {
          proposeDrop(allowedDropIndex(getDropIndex(event, hoverIndex, target)))
        }
      }
    }
  }
  function touchEnd(event) {
    if (!latestPosition) {
      return  // hold selected -> clear selection
    }
    const target = getTarget(latestPosition)
    if (!isHolding && startPosition === latestPosition) {
      event.preventDefault()
      if (hasClass(target, "track-art")) {
        touchlist.playTrackAtIndex(fromIndex)
      } else {
        touchlist.toggleSelection(fromIndex)
      }
    } else if (touchlist.state.selection.size) {
      const hoverIndex = getIndex(target)
      if (hoverIndex !== null) {
        const toIndex = allowedDropIndex(getDropIndex(event, hoverIndex, target))
        if (toIndex >= 0 && touchlist.props.onMoveItems) {
          event.preventDefault()
          const selection = touchlist.state.selection.toJS()
          touchlist.props.onMoveItems(fromIndex, toIndex, selection)
        }
      }
    }
    dragEnd()
    cancelHold()
  }
  function cancelHold() {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }
  function getTarget(pos) {
    return document.elementFromPoint(pos.x, pos.y)
  }
  function getIndex(el) {
    while (el) {
      if ("index" in el.dataset) {
        return parseInt(el.dataset.index)
      }
      if (el.classList.contains(touchlist.id)) {
        break // TODO get index (0 or last index) depending on pos.y
      }
      el = el.parentNode
    }
    return null
  }
  function hasClass(el, className) {
    while (el) {
      if (el.classList && el.classList.contains(className)) {
        return true
      }
      el = el.parentNode
    }
    return false
  }
  function proposeDrop(dropIndex) {
    if (touchlist.state.dropIndex !== dropIndex) {
      touchlist.setState({dropIndex})
    }
  }
  function allowedDropIndex(index) {
    const sel = touchlist.state.selection
    if (sel.has(fromIndex)) {
      if (!(sel.has(index) || sel.has(index - 1))) {
        return index
      }
    } else if (index !== fromIndex && index !== fromIndex + 1) {
      return index
    }
    return -1
  }
  function getDropIndex(event, index, target=event.currentTarget) {
    const a = event.clientY - target.offsetTop
    const b = target.offsetHeight / 2
    return a > b ? index + 1 : index
  }
  function dragStart(event, index) {
    const mayMove = touchlist.props.onMoveItems
    if (mayMove) {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData(touchlist.id, String(index))
      fromIndex = index
    }
    if (touchlist.props.dataType) {
      const data = touchlist.getDragData(index)
      event.dataTransfer.setData(touchlist.props.dataType, data)
      event.dataTransfer.effectAllowed = mayMove ? "copyMove" : "copy"
    }
  }
  function dragOver(event, index) {
    const isMove = touchlist.props.onMoveItems &&
      Set(event.dataTransfer.types).has(touchlist.id)
    const dropIndex = isMove ? allowedDropIndex(getDropIndex(event, index)) : -1
    if (dropIndex >= 0) {
      event.preventDefault()
    }
    if (isMove || touchlist.canDrop(event.dataTransfer.types)) {
      proposeDrop(dropIndex)
    }
  }
  function dragEnd() {
    fromIndex = -1
    touchlist.setState({dropIndex: -1})
  }
  function drop(event, index) {
    const isMove = touchlist.props.onMoveItems &&
      Set(event.dataTransfer.types).has(touchlist.id)
    if (isMove) {
      const fromIndex = parseInt(event.dataTransfer.getData(touchlist.id))
      const sel = touchlist.state.selection.toJS()
      touchlist.props.onMoveItems(fromIndex, getDropIndex(event, index), sel)
    } else if (touchlist.props.onDrop) {
      touchlist.props.onDrop(event, index)
    }
  }

  return {
    setTouchHandlers,
    dragStart,
    dragOver,
    dragEnd,
    drop,
  }
}
