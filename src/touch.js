import { List as IList, Range, Set } from 'immutable'
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
 *   `TouchList.Item` at the same position in the `TouchList`. All
 *   index arguments provided to event handlers can be used to
 *   reference items in this list.
 * - selection: `Set` of selected indexes. If not provided the selection
 *   will be maintained internally. Each index in this set should
 *   correspond to the index of an item in the `items` list.
 * - dropTypes: Array of data types that can be dropped in this list.
 *   Dropping is not supported if this prop is not provided.
 * - onTap: Callback function handling tap on list item element
 *   with the class "tap-zone". Return `true` to also toggle item
 *   selection.
 *   event handling. Signature: `onTap(item, index, event)`
 * - onDrop: Callback function for handling dropped content.
 *   Signature: `onDrop(data, dataType, index, event)`
 * - onLongTouch: Callback function for handling long-touch event.
 *   Return `true` to also toggle item selection (the default action).
 *   Signature: `onLongTouch(item, index) -> bool`
 * - onMoveItems: Callback function for handling drag/drop movement
 *   (sorting) of items within the list. Sorting will be disabled if
 *   this prop is not provided.
 *   Signature: `onMoveItems(indexSet, toIndex)`
 * - onSelectionChanged: Callback function to handle selection changes.
 *   Signature: `onSelectionChanged(selection, isTouch)`
 */
export class TouchList extends React.Component {
  constructor(props) {
    super(props)
    this.id = _.uniqueId("touch-list-")
    this.state = {
      dropTypes: {},
      selection: props.selection || Set(),
      lastSelected: IList(),
    }
    this.slide = makeSlider(this)
  }
  componentDidMount() {
    this.slide.setTouchHandlers(ReactDOM.findDOMNode(this))
  }
  componentWillUnmount() {
    this.slide.setTouchHandlers(null)
  }
  componentWillReceiveProps(props) {
    if (!props.items) {
      throw new Error("TouchList.props.items must be an indexed collection")
    }
    const dropTypes = _.zipObject(props.dropTypes)
    if (!_.isEqual(dropTypes, this.state.dropTypes)) {
      this.setState({dropTypes})
    }
    if (props.selection) {
      if (!props.selection.equals(this.state.selection)) {
        this.setState({
          selection: props.selection,
          lastSelected: this.state.lastSelected
            .filter(index => props.selection.has(index)),
        })
      }
    } else if (!this.props.items || !this.props.items.equals(props.items)) {
      this.setState({selection: Set(), lastSelected: IList()})
    }
  }
  getChildContext() {
    return {
      TouchList_selection: this.state.selection,
      TouchList_onItemSelected: this.onItemSelected.bind(this),
      TouchList_slide: this.slide,
    }
  }
  getDragData(index) {
    const items = this.props.items
    let selected
    if (items.has(index)) {
      if (this.state.selection.has(index)) {
        selected = this.state.selection
          .valueSeq()
          .sort()
          .map(index => items.get(index).toObject())
          .toList()
      } else {
        selected = IList([items.get(index).toObject()])
      }
    } else {
      return []
    }
    return selected.toArray()
  }
  getAllowedDropType(possibleTypes) {
    const dropTypes = this.state.dropTypes
    return _.find(possibleTypes, value => dropTypes.hasOwnProperty(value))
  }
  onTap(index, event) {
    if (this.props.onTap) {
      const item = this.props.items.get(index)
      return this.props.onTap(item && item.toObject(), index, event)
    }
  }
  onItemSelected(index, modifier, isTouch=false) {
    this.selectionChanged(({selection, lastSelected}) => {
      if (!modifier) {
        return {selection: Set([index]), lastSelected: IList([index])}
      }
      if (modifier === SINGLE) {
        if (!selection.has(index)) {
          selection = selection.add(index)
          lastSelected = lastSelected.push(index)
        } else {
          selection = selection.remove(index)
          if (lastSelected.last() === index) {
            lastSelected = lastSelected.pop()
          }
        }
      } else if (modifier === TO_LAST) {
        const from = lastSelected.last() || 0
        const step = from <= index ? 1 : -1
        selection = selection.union(Range(from, index + step, step))
        lastSelected = lastSelected.push(index)
      }
      return {selection, lastSelected}
    }, undefined, isTouch)
  }
  onLongTouch(index) {
    if (this.props.onLongTouch) {
      const item = this.props.items.get(index)
      if (this.props.onLongTouch(item && item.toObject(), index)) {
        this.toggleSelection(index, true)
      }
    } else {
      this.toggleSelection(index, true)
    }
  }
  toggleSelection(index, isTouch=false) {
    this.onItemSelected(index, SINGLE, isTouch)
  }
  clearSelection() {
    this.selectionChanged(Set(), IList())
  }
  selectionChanged(selection, lastSelected, isTouch=false) {
    if (_.isFunction(selection)) {
      this.setState((state, props) => {
        const func = props.onSelectionChanged
        const newState = selection(state)
        this._updateItemSelections(state, newState)
        if (func && !newState.selection.equals(props.selection)) {
          func(newState.selection, isTouch)
        }
        // maybe broken: setState completes after onSelectionChanged
        return newState
      })
    } else {
      if (!selection.equals(this.state.selection)) {
        const func = this.props.onSelectionChanged
        this._updateItemSelections(this.state, {selection})
        this.setState({selection, lastSelected})
        if (func && !selection.equals(this.props.selection)) {
          func(selection, isTouch)
        }
      } else if (!lastSelected.equals(this.state.lastSelected)) {
        this.setState({lastSelected})
      }
    }
  }
  _updateItemSelections(oldState, newState) {
    const selected = newState.selection.subtract(oldState.selection)
    const deselected = oldState.selection.subtract(newState.selection)
    if (selected.size) {
      this.slide.select(selected)
    }
    if (deselected.size) {
      this.slide.deselect(deselected)
    }
  }
  render() {
    const props = this.props
    const others = excludeKeys(props, TOUCHLIST_PROPS, "TouchList")
    others.className = "touchlist " + this.id
    if (props.className) {
      others.className += " " + props.className
    }
    return <List {...others}>{props.children}</List>
  }
}

TouchList.childContextTypes = {
  TouchList_selection: PropTypes.object.isRequired,
  TouchList_onItemSelected: PropTypes.func.isRequired,
  TouchList_slide: PropTypes.object.isRequired,
}

const TOUCHLIST_PROPS = {
  items: true,
  selection: true,
  children: true,
  dataType: true,
  dropTypes: true,
  onDrop: true,
  onLongTouch: true,
  onMoveItems: true,
  onSelectionChanged: true,
  onTap: true,
}

/**
 * Item component for TouchList
 *
 * Important props:
 * - index: required unique/consecutive index for this item.
 */
export class TouchListItem extends React.Component {
  constructor() {
    super()
    this.state = {selected: false, dropClass: null}
  }
  componentWillReceiveProps(props, context) {
    const index = props.index
    const selected = context.TouchList_selection.has(index)
    if (this.state.selected !== selected) {
      this.setState({selected})
    }
  }
  componentWillUnmount() {
    const slide = this.context.TouchList_slide
    slide && slide.removeItem(this.props.index, this)
  }
  setSelected(selected) {
    if (this.state.selected !== selected) {
      this.setState({selected})
    }
  }
  clearDropIndicator() {
    if (this.state.dropClass !== null) {
      this.setState({dropClass: null})
    }
  }
  onDragOver(event, index, target) {
    const dropIndex = this.context.TouchList_slide.dragOver(event, index, target)
    const dropClass = index === dropIndex - 1 ? "dropAfter" :
                      index === dropIndex ? "dropBefore" : null
    if (this.state.dropClass !== dropClass) {
      this.setState({dropClass})
    }
  }
  onDrop(event, index) {
    this.clearDropIndicator()
    this.context.TouchList_slide.drop(event, index)
  }
  render() {
    const props = this.props
    if (!props.hasOwnProperty("index")) {
      throw new Error("`TouchList.Item` `props.index` is required")
    }
    const passProps = excludeKeys(props, TOUCHLISTITEM_PROPS, "TouchList.Item")
    const slide = this.context.TouchList_slide
    const index = props.index
    // this seems hacky, but can't think of any other way get touch events
    slide.addItem(index, this)
    if (!props.hasOwnProperty("onContextMenu")) {
      passProps.onContextMenu = event => event.preventDefault()
    }
    return <List.Item
        onClick={event => {
          const modifier = event.metaKey || event.ctrlKey ? SINGLE :
            (event.shiftKey ? TO_LAST : null)
          this.context.TouchList_onItemSelected(index, modifier)
        }}
        onDragStart={event => slide.dragStart(event, index)}
        onDragOver={event => this.onDragOver(event, index)}
        onDrop={event => this.onDrop(event, index)}
        onDragLeave={this.clearDropIndicator.bind(this)}
        onDragEnd={this.clearDropIndicator.bind(this)}
        data-touchlist-item-index={index /* touchlistItemIndex */}
        className={_.filter([
          "touchlist-item",
          this.state.selected ? "selected" : "",
          this.state.dropClass,
          props.className
        ]).join(" ")}
        draggable
        {...passProps}>
      {props.children}
    </List.Item>
  }
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
 *  - tappable reigions (class="tap-zone")
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
  const items = {}
  let listeners = []
  let holdTimer = null
  let isMoving = false
  let isHolding = false
  let isTouchDrag = false
  let startPosition = null
  let latestPosition = null
  let startIndex = null
  let latestIndex = null

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

  function addItem(index, item) {
    items[index] = item
  }
  function removeItem(index, item) {
    if (items[index] === item) {
      delete items[index]
    }
  }
  function select(indices) {
    indices.forEach(index => items[index] && items[index].setSelected(true))
  }
  function deselect(indices) {
    indices.forEach(index => items[index] && items[index].setSelected(false))
  }
  function isTouchMove(pointA, pointB) {
    const x = Math.abs(pointA.x - pointB.x)
    const y = Math.abs(pointA.y - pointB.y)
    return isMoving || Math.sqrt(x * x + y * y) > 5
  }
  function position(event, withIndex=false) {
    const target = withIndex ? getTarget(event.touches[0]) : null
    const [index, listitem] = withIndex ? getIndex(target) : [null, null]
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      touch: event.touches[0],
      time: event.timeStamp,
      index,
      target,
      listitem,
    }
  }
  function touchStart(event) {
    if (event.touches.length > 1) {
      return
    }
    const pos = startPosition = latestPosition = position(event, true)
    const isSelected = touchlist.state.selection.has(pos.index)
    if (touchlist.props.onMoveItems) {
      event.target.dataset.touchlistId = touchlist.id
      startIndex = pos.index
    }
    if (touchlist.props.dataType) {
      const data = touchlist.getDragData(pos.index)
      event.target.dataset.touchlistDragType = touchlist.props.dataType
      event.target.dataset.touchlistDragData = JSON.stringify(data)
    }
    isMoving = false
    isHolding = false
    isTouchDrag = hasClass(pos.target, "drag-handle")
    holdTimer = setTimeout(() => {
      isHolding = true
      if (!isTouchMove(startPosition, latestPosition) && !isTouchDrag) {
        if (isSelected && touchlist.state.selection.size) {
          touchlist.clearSelection()
          isHolding = false
          latestPosition = null  // do nothing on touchEnd
        } else {
          isTouchDrag = true
          touchlist.onLongTouch(pos.index)
        }
      }
    }, 300)
  }
  function touchMove(event) {
    cancelHold()
    const pos = latestPosition = position(event, isTouchDrag)
    isMoving = isMoving || isTouchMove(startPosition, latestPosition)
    if (isTouchDrag) {
      const index = pos.index
      event.preventDefault()
      if (index !== latestIndex && items.hasOwnProperty(latestIndex)) {
        items[latestIndex].clearDropIndicator()
      }
      latestIndex = index
      if (index !== null && items.hasOwnProperty(index)) {
        items[index].onDragOver(event, index)
      }
    }
  }
  function touchEnd(event) {
    if (!latestPosition) {
      return  // hold selected -> clear selection
    }
    if (!isHolding && !isTouchMove(startPosition, latestPosition)) {
      const {index, target} = startPosition
      if (hasClass(target, "tap-zone")) {
        if (touchlist.onTap(index, event)) {
          touchlist.toggleSelection(index, true)
        }
      } else {
        event.preventDefault()
        touchlist.toggleSelection(index, true)
      }
    } else if (touchlist.state.selection.size) {
      if (latestPosition.index !== null) {
        const {index, target} = latestPosition
        const toIndex = allowedDropIndex(event, index, target)
        if (toIndex !== null) {
          drop(event, index)
        }
        event.preventDefault()
      }
    }
    latestPosition = null
    delete event.target.dataset.touchlistId
    delete event.target.dataset.touchlistDragType
    delete event.target.dataset.touchlistDragData
    if (items.hasOwnProperty(latestIndex) ) {
      items[latestIndex].clearDropIndicator()
      latestIndex = null
    }
    isTouchDrag = false
    cancelHold()
  }
  function cancelHold() {
    if (holdTimer) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }
  function getTarget(touch) {
    return document.elementFromPoint(touch.clientX, touch.clientY)
  }
  function getIndex(el) {
    while (el && el.parentNode) {
      if ("touchlistItemIndex" in el.dataset) {
        return [parseInt(el.dataset.touchlistItemIndex), el]
      }
      if (el.classList.contains(touchlist.id)) {
        break // TODO get index (0 or last index) depending on pos.y
      }
      el = el.parentNode
    }
    return [null, null]
  }
  function getDataTypes(event) {
    if (event.dataTransfer) {
      // drag/drop event
      return event.dataTransfer.types
    }
    // touch event
    const dataset = event.target.dataset
    const types = [dataset.touchlistId]
    if (dataset.touchlistDragType) {
      return types.push(dataset.touchlistDragType)
    }
    return types
  }
  function getData(event, dataTypes) {
    const dropType = touchlist.getAllowedDropType(dataTypes)
    let data = null
    if (event.dataTransfer) {
      // drag/drop event
      data = event.dataTransfer.getData(dropType)
    } else if (dropType === event.target.dataset.touchlistDragType) {
      // touch event
      data = event.target.dataset.touchlistDragData
    }
    return [data && JSON.parse(data), dropType]
  }
  function getMoveIndex(event, dataTypes) {
    if (touchlist.props.onMoveItems && dataTypes.indexOf(touchlist.id) !== -1) {
      // use local state because dragOver events do not allow access to the data
      return startIndex
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
  function allowedDropIndex(event, index, target=event.currentTarget) {
    const dataTypes = getDataTypes(event)
    const moveIndex = getMoveIndex(event, dataTypes)
    const dropIndex = getDropIndex(event, index, target)
    if (moveIndex === null) {
      return touchlist.getAllowedDropType(dataTypes) ? dropIndex : null
    }
    const sel = touchlist.state.selection
    if (sel.has(moveIndex)) {
      if (!(sel.has(dropIndex) || sel.has(dropIndex - 1))) {
        return dropIndex
      }
    } else if (dropIndex !== moveIndex && dropIndex !== moveIndex + 1) {
      return dropIndex
    }
    return null
  }
  function getDropIndex(event, index, target=event.currentTarget) {
    if (latestPosition) {
      event = latestPosition.touch
    }

    // https://www.quirksmode.org/js/events_properties.html#position
    let pointerY = 0
    if (event.pageY !== undefined) {
      pointerY = event.pageY
    }
    else if (event.clientY !== undefined) {
      pointerY = event.clientY + document.body.scrollTop +
        document.documentElement.scrollTop
    }
    // https://www.quirksmode.org/js/findpos.html
    let targetY = 0
    let obj = target
    while (obj.offsetParent) {
      targetY += obj.offsetTop
      obj = obj.offsetParent
    }

    const a = pointerY - targetY
    const b = target.offsetHeight / 2
    return a > b ? index + 1 : index
  }
  function dragStart(event, index) {
    const mayMove = touchlist.props.onMoveItems
    if (mayMove) {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData(touchlist.id, "")
      startIndex = index
    }
    if (touchlist.props.dataType) {
      const data = JSON.stringify(touchlist.getDragData(index))
      event.dataTransfer.setData(touchlist.props.dataType, data)
      event.dataTransfer.effectAllowed = mayMove ? "copyMove" : "copy"
    }
  }
  function dragOver(event, index, target) {
    const dropIndex = allowedDropIndex(event, index, target)
    if (dropIndex !== null) {
      event.preventDefault()
    }
    return dropIndex
  }
  function drop(event, index) {
    const dropIndex = getDropIndex(event, index)
    if (dropIndex >= 0) {
      const dataTypes = getDataTypes(event)
      const moveIndex = getMoveIndex(event, dataTypes)
      if (moveIndex !== null) {
        let selection = touchlist.state.selection
        if (!selection.has(moveIndex)) {
          selection = Set([moveIndex])
        }
        touchlist.props.onMoveItems(selection, dropIndex)
      } else if (touchlist.props.onDrop) {
        touchlist.props.onDrop(...getData(event, dataTypes), dropIndex, event)
      }
    }
  }

  return {
    addItem,
    removeItem,
    select,
    deselect,
    setTouchHandlers,
    dragStart,
    dragOver,
    drop,
  }
}
