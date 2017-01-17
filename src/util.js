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
    after: (ms, func) => {
      const id = setTimeout(func, ms)
      timers.push(id)
      return id
    },
    every: (ms, func) => {
      const id = setInterval(func, ms)
      timers.push(id)
      return id
    },
    clear: id => {
      if (id !== undefined) {
        clearTimeout(id)
      } else {
        _.each(timers, id => clearTimeout(id))
        timers = []
      }
    },
  }
}

export function backoff(maxMs, minMs=0) {
  const half = (minMs || 1000) / 2
  let last = Date.now() - maxMs - 1
  let wait = half
  return () => {
    const now = Date.now()
    const elapsed = now - last
    last = now
    if (elapsed > maxMs) {
      wait = half
      return minMs
    }
    wait = wait * 2
    return _.min([wait, maxMs])
  }
}
