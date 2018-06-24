import _ from 'lodash'

export function formatTime(seconds) {
  if (!seconds) {
    seconds = 0
  }
  const neg = seconds < 0
  if (neg) {
    seconds = -seconds
  }
  const date = new Date(null)
  date.setSeconds(seconds)
  let time = date.toISOString().substr(11, 8)
  if (time.startsWith("00:0")) {
    time = time.slice(4)
  } else if (time.startsWith("00:")) {
    time = time.slice(3)
  }
  return (neg ? '-' : '') + time
}

export function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n)
}

export function timer() {
  let timers = []
  return {
    after: (ms, func, ...args) => {
      let clear = null
      const promise = new Promise((resolve) => {
        const id = setTimeout(() => {
          const index = timers.indexOf(clear)
          if (index > -1) {
            timers.splice(index, 1)
          }
          resolve(func(...args))
        }, ms)
        clear = resolution => {
          clearTimeout(id)
          resolve(resolution)
        }
        timers.push(clear)
      })
      promise.wait = ms
      promise.func = func
      promise.clear = clear
      return promise
    },
    isActive: () => {
      return timers.length
    },
    clear: resolution => {
      _.each(timers, clear => clear(resolution))
      timers = []
    },
  }
}

export function backoff(maxMs, minMs=0) {
  const half = (minMs || 1000) / 2
  let wait = half
  return () => {
    if (wait > maxMs) {
      return maxMs
    }
    wait = wait * 2
    return _.min([wait, maxMs])
  }
}

export function operationError(message, context, showFor=5 /* seconds */) {
  return require("./menu").actions.operationError(message, context, showFor)
}
