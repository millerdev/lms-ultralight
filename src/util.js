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
      let clear = null
      const promise = new Promise((resolve, reject) => {
        const id = setTimeout(() => resolve(func()), ms)
        clear = () => {
          clearTimeout(id)
          reject(new Error("cleared: " + id))
        }
        timers.push(clear)
      })
      promise.wait = ms
      promise.func = func
      promise.clear = clear
      return promise
    },
    clear: () => {
      _.each(timers, clear => clear())
      timers = []
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
