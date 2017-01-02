
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
