import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'
import ReactDOM from 'react-dom'
import { useInView } from 'react-intersection-observer'
import { useResizeDetector } from 'react-resize-detector'
import { List, Ref } from 'semantic-ui-react'

import { memoize } from './util'
import './touch.styl'

export const SINGLE = "single"
export const TO_LAST = "to last"

/**
 * Touch-interactive list supporting selection and drag/drop
 *
 * Important props:
 * - items: Array of items, which will be serialized in drag/drop
 *   operations. Each item in this list should correspond to a
 *   `TouchList.Item` at the same position in the `TouchList`. All
 *   index arguments provided to event handlers can be used to
 *   reference items in this list.
 * - itemsOffset: Count of items in the list before the first in
 *   `items`. Default: 0.
 * - itemsTotal: Total number of items in the list.
 *   Default: `offset + items.length`, ignored if less.
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
 * - onLoadItems: Callback function to load more items when approaching
 *   a boundary of already-loaded items. Will only be called if
 *   `itemsOffset` or `itemsTotal` are provided. The `range` argument
 *   is a two-item array of indices with the first being the most
 *   important to load and the second being least important; the first
 *   will be greater than the second when loading above `items`.
 *   Signature: `onLoadItems(<range>)`
 */
export class TouchList extends React.Component {
  constructor(props) {
    if (!props.items) {
      throw new Error("TouchList.props.items must be an indexed collection")
    }
    super(props)
    this.id = _.uniqueId("touch-list-")
    // use internal selection if selection not provided
    this.internalSelection = props.selection ? null : new Set()
    this.oldSelection = this.getSelection()
    this.lastSelected = []
    this.slide = makeSlider(this)
  }
  componentDidMount() {
    this.slide.setTouchHandlers(ReactDOM.findDOMNode(this))
  }
  componentWillUnmount() {
    this.slide.setTouchHandlers(null)
  }
  componentDidUpdate() {
    const newSelection = this.getSelection()
    if (!_.isEqual(newSelection, this.oldSelection)) {
      const lastSelected = this.lastSelected.filter(i => newSelection.has(i))
      this._updateItemSelections(newSelection, lastSelected, this.oldSelection)
    }
    return null
  }
  getChildContext() {
    return {
      TouchList_isSelected: this.isSelected,
      TouchList_onItemSelected: this.onItemSelected,
      TouchList_slide: this.slide,
    }
  }
  getSelection() {
    return this.internalSelection || this.props.selection
  }
  isSelected = (index) => {
    return this.getSelection().has(index)
  }
  getDragData(index) {
    const items = this.props.items
    let selected
    if (index < items.length) {
      if (this.isSelected(index)) {
        selected = [...this.getSelection()]
          .sort()
          .map(index => items[index])
      } else {
        selected = [items[index]]
      }
    } else {
      return []
    }
    return selected
  }
  getAllowedDropType(possibleTypes) {
    const dropTypes = _.zipObject(this.props.dropTypes)
    return _.find(possibleTypes, value => _.has(dropTypes, value))
  }
  onTap(index, event) {
    if (this.props.onTap) {
      const item = this.props.items[index]
      return this.props.onTap(item, index, event)
    }
  }
  onItemSelected = (index, modifier, isTouch=false) => {
    if (!modifier) {
      this.selectionChanged(new Set([index]), [index], isTouch)
      return
    }
    let selection = this.getSelection()
    let lastSelected = this.lastSelected
    if (modifier === SINGLE) {
      if (!selection.has(index)) {
        selection = new Set(selection).add(index)
        lastSelected = [...lastSelected, index]
      } else {
        selection = new Set(selection)
        selection.delete(index)
        if (_.last(lastSelected) === index) {
          lastSelected = lastSelected.slice(0, -1)
        }
      }
    } else if (modifier === TO_LAST) {
      const from = _.last(lastSelected) || 0
      const step = from <= index ? 1 : -1
      selection = new Set([
        ...selection,
        ..._.range(from, index + step, step),
      ])
      lastSelected = [...lastSelected, index]
    }
    this.selectionChanged(selection, lastSelected, isTouch)
  }
  onLongTouch(index) {
    if (this.props.onLongTouch) {
      const item = this.props.items[index]
      if (this.props.onLongTouch(item, index)) {
        this.toggleSelection(index)
      }
    } else {
      this.toggleSelection(index)
    }
  }
  toggleSelection(index, isTouch=true) {
    this.onItemSelected(index, SINGLE, isTouch)
  }
  clearSelection() {
    this.selectionChanged(new Set(), [])
  }
  selectionChanged(selection, lastSelected, isTouch=false) {
    if (!_.isEqual(selection, this.oldSelection)) {
      const oldSelection = this.oldSelection
      const func = this.props.onSelectionChanged
      if (func) {
        this.oldSelection = selection
        this.lastSelected = lastSelected
        func(selection, isTouch)
      }
      this._updateItemSelections(selection, lastSelected, oldSelection)
    } else if (!_.isEqual(lastSelected, this.lastSelected)) {
      this.lastSelected = lastSelected
    }
  }
  _updateItemSelections(newSelection, lastSelected, oldSelection) {
    function diff(set1, set2) {
      return new Set([...set1].filter(x => !set2.has(x)))
    }
    if (this.internalSelection) {
      this.internalSelection = newSelection
    }
    // this.oldSelection mirrors the state of the DOM
    // can they ever get out of sync?
    const selected = diff(newSelection, oldSelection)
    const deselected = diff(oldSelection, newSelection)
    if (selected.size) {
      this.slide.selectionDidChange(selected)
    }
    if (deselected.size) {
      this.slide.selectionDidChange(deselected)
    }
    // does this internal state break any React contracts?
    this.oldSelection = newSelection
    this.lastSelected = lastSelected
  }
  render() {
    const props = this.props
    const others = excludeKeys(props, TOUCHLIST_PROPS, "TouchList")
    others.className = "touchlist " + this.id
    if (props.className) {
      others.className += " " + props.className
    }
    return <LoadingList {...others} />
  }
}

export const LoadingList = ({
  items, itemsOffset, itemsTotal, onLoadItems, ...props
}) => {
  const { height, ref } = useResizeDetector({handleWidth: false})
  // debounce wait (200) should be enough time to render and resize
  const [debounced] = React.useState(() => _.debounce(v => v, 200))
  // use leading edge when debounced value is undefined, else trailing
  const stabilize = value => value && debounced(value) || value
  const count = items ? items.length : 0
  const itemHeight = stabilize(height / count)
  const cx = buildLoadingContext(itemsOffset, count, itemsTotal, onLoadItems)
  return <LoadingContext.Provider value={cx}>
    <LoadingSpacer height={cx.before * itemHeight} range={cx.above} />
    <Ref innerRef={ref}><List {...props} /></Ref>
    <LoadingSpacer height={cx.after * itemHeight} range={cx.below} />
  </LoadingContext.Provider>
}

const LoadingContext = React.createContext()
const noop = () => {}

export const buildLoadingContext = memoize((
  offset, count, total, onLoadItems=noop,
) => {
  const before = offset || 0
  const after = _.max([(total || 0) - before - count, 0])
  const above = [before, 0]
  const below = [before + count, total]
  const ranges = {}
  const tx = 10  // offset of inner trigger item
  const st = tx - 1
  if (count) {
    if (above[0]) {
      _.range(0, _.min([tx, count]), st).forEach(i => ranges[i] = above)
    }
    const last = count - 1
    if (below[0] !== below[1]) {
      _.range(last, _.max([0, last - tx]), -st).forEach(i => ranges[i] = below)
    }
  }
  return {before, after, above, below, ranges, onLoadItems}
})

const LoadingSpacer = ({ height, range }) => {
  const { onLoadItems } = React.useContext(LoadingContext)
  const { ref, inView } = useInView({skip: !height})
  height && inView && onLoadItems(range)
  return React.useMemo(() => {
    return height ? <Ref innerRef={ref}><div style={{height}} /></Ref> : null
  }, [height, ref])
}

TouchList.childContextTypes = {
  TouchList_isSelected: PropTypes.func.isRequired,
  TouchList_onItemSelected: PropTypes.func.isRequired,
  TouchList_slide: PropTypes.object.isRequired,
}

const TOUCHLIST_PROPS = {
  // "items" props are used by LoadingList
  // items: true,
  // itemsOffset: true,
  // itemsTotal: true,
  // onLoadItems: true,
  selection: true,
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
    this.state = {dropClass: null}
  }
  componentWillUnmount() {
    const slide = this.context.TouchList_slide
    slide && slide.removeItem(this.props.index, this)
  }
  clearDropIndicator = () => {
    if (this.state.dropClass !== null) {
      this.setState({dropClass: null})
    }
  }
  onDragOver(event, index) {
    const dropIndex = this.context.TouchList_slide.dragOver(event, index)
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
    if (!_.has(props, "index")) {
      throw new Error("`TouchList.Item` `props.index` is required")
    }
    const passProps = excludeKeys(props, TOUCHLISTITEM_PROPS, "TouchList.Item")
    const slide = this.context.TouchList_slide
    const index = props.index
    const selected = this.context.TouchList_isSelected(index)
    // this seems hacky, but can't think of any other way get touch events
    slide.addItem(index, this)
    if (!_.has(props, "onContextMenu")) {
      passProps.onContextMenu = event => event.preventDefault()
    }
    return <LoadingListItem
      onClick={event => {
        const modifier = event.metaKey || event.ctrlKey ? SINGLE :
          (event.shiftKey ? TO_LAST : null)
        this.context.TouchList_onItemSelected(index, modifier)
      }}
      onDragStart={event => slide.dragStart(event, index)}
      onDragOver={event => this.onDragOver(event, index)}
      onDrop={event => this.onDrop(event, index)}
      onDragLeave={this.clearDropIndicator}
      onDragEnd={this.clearDropIndicator}
      data-touchlist-item-index={index /* touchlistItemIndex */}
      className={_.filter([
        "touchlist-item",
        selected ? "selected" : "",
        this.state.dropClass,
        props.className,
      ]).join(" ")}
      draggable
      {...passProps}
    />
  }
}

export const LoadingListItem = ({index, ...props}) => {
  const { onLoadItems, ranges } = React.useContext(LoadingContext)
  const skip = !_.has(ranges, index)
  const { ref, inView } = useInView({skip, triggerOnce: true})
  inView && onLoadItems(ranges[index], index)
  return <Ref innerRef={ref}><List.Item {...props} /></Ref>
}

const TOUCHLISTITEM_PROPS = {
  //index: true,  consumed by LoadingListItem
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
  TouchList_isSelected: PropTypes.func.isRequired,
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
  function selectionDidChange(indices) {
    indices.forEach(index => items[index] && items[index].forceUpdate())
  }
  function isTouchMove(pointA, pointB) {
    const x = Math.abs(pointA.touch.clientX - pointB.touch.clientX)
    const y = Math.abs(pointA.touch.clientY - pointB.touch.clientY)
    return isMoving || Math.sqrt(x * x + y * y) > 5
  }
  function position(event, withIndex=false) {
    const touch = event.touches[0]
    let index = null
    let target = null
    let listitem = null
    if (withIndex) {
      target = document.elementFromPoint(touch.clientX, touch.clientY);
      [index, listitem] = getIndex(target)
    }
    return {touch, index, target, listitem}
  }
  function touchStart(event) {
    if (event.touches.length > 1) {
      return
    }
    const pos = position(event, true)
    if (hasClass(pos.target, "no-drag")) {
      return
    }
    startPosition = latestPosition = pos
    const selected = touchlist.isSelected(pos.index)
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
        if (selected && touchlist.getSelection().size) {
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
      if (index !== latestIndex && _.has(items, latestIndex)) {
        items[latestIndex].clearDropIndicator()
      }
      latestIndex = index
      if (index !== null && _.has(items, index)) {
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
      if (index !== null) {
        if (hasClass(target, "tap-zone")) {
          if (touchlist.onTap(index, event)) {
            touchlist.toggleSelection(index)
          }
        } else {
          event.preventDefault()
          touchlist.toggleSelection(index)
        }
      }
    } else if (touchlist.getSelection().size) {
      if (latestPosition.index !== null) {
        const toIndex = allowedDropIndex(event, latestPosition.index)
        if (toIndex !== null) {
          handleDrop(event, toIndex)
        }
        event.preventDefault()
      }
    }
    latestPosition = null
    delete event.target.dataset.touchlistId
    delete event.target.dataset.touchlistDragType
    delete event.target.dataset.touchlistDragData
    if (_.has(items, latestIndex)) {
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
    const types = []
    if (dataset.touchlistId) {
      types.push(dataset.touchlistId)
    }
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
  function allowedDropIndex(event, index) {
    const dataTypes = getDataTypes(event)
    const moveIndex = getMoveIndex(event, dataTypes)
    const dropIndex = getDropIndex(event, index)
    if (moveIndex === null) {
      return touchlist.getAllowedDropType(dataTypes) ? dropIndex : null
    }
    const isSelected = touchlist.isSelected
    if (isSelected(moveIndex)) {
      if (!(isSelected(dropIndex) || isSelected(dropIndex - 1))) {
        return dropIndex
      }
    } else if (dropIndex !== moveIndex && dropIndex !== moveIndex + 1) {
      return dropIndex
    }
    return null
  }
  function getDropIndex(event, index) {
    let target
    if (latestPosition) {
      event = latestPosition.touch
      target = latestPosition.listitem
    } else {
      target = event.currentTarget
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
    const target = document.elementFromPoint(event.clientX, event.clientY)
    if (hasClass(target, "no-drag")) {
      event.preventDefault()
      return
    }
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
  function dragOver(event, index) {
    const dropIndex = allowedDropIndex(event, index)
    if (dropIndex !== null) {
      event.preventDefault()
    }
    return dropIndex
  }
  function drop(event, index) {
    handleDrop(event, getDropIndex(event, index))
  }
  function handleDrop(event, dropIndex) {
    if (dropIndex >= 0) {
      const dataTypes = getDataTypes(event)
      const moveIndex = getMoveIndex(event, dataTypes)
      if (moveIndex !== null) {
        let selection = touchlist.getSelection()
        if (!selection.has(moveIndex)) {
          selection = new Set([moveIndex])
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
    selectionDidChange,
    setTouchHandlers,
    dragStart,
    dragOver,
    drop,
  }
}
