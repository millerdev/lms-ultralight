import _ from 'lodash'

/**
 * Check promise callbacks
 *
 * Usage:
 *  ```js
 *  const promise = promiseChecker(1)
 *  const foo = arg => 'foo ' + arg
 *
 *  # setup callback checks
 *  promise
 *    .then(callback => { assert.equal(callback, foo) })
 *    .done()
 *
 *  # add handlers as if to a real promise
 *  promise.then(foo)
 *
 *  # assert all checks performed
 *  promise.check()
 *  ```
 */
export function promiseChecker() {
  const makeHandler = type => ((...args) => {
    const callback = args[0]
    assert.isAtMost(args.length, 1, "wrong number of arguments: " + args)
    if (isSettingUp) {
      assert.isFunction(callback, "check callback not provided")
      checks.push({type, callback})
    } else if (checkCount < checks.length) {
      const check = checks[checkCount]
      assert.equal(check.type, type,
        "check " + (checkCount + 1) + " expected '" +
        (type === "then" ? "catch" : "then") + "' but got '" + type + "'")
      check.callback(callback)
      checkCount += 1
    } else {
      assert(false, "exceeded " + checks.length + " promise handlers")
    }
    return promise
  })
  const promise = {
    then: makeHandler("then"),
    catch: makeHandler("catch"),
    done: () => {
      isSettingUp = false
      return promise
    },
    check: () => {
      assert(!isSettingUp, "setup phase not done()")
      assert.equal(checkCount, checks.length,
        "wrong check count: " + checkCount + " != " + checks.length)
    },
  }
  const checks = []
  let isSettingUp = true
  let checkCount = 0
  return promise
}

export function rewire(__RewireAPI__, sets, callback) {
  const resets = _.map(sets, (value, key) => __RewireAPI__.__set__(key, value))
  let result = null
  try {
    result = callback()
    if (result && result.finally) {
      return result.finally(() => resets.forEach(reset => reset()))
    }
    return result
  } finally {
    if (!(result && result.finally)) {
      resets.forEach(reset => reset())
    }
  }
}

