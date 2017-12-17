import _ from 'lodash'

/**
 * Check promise callbacks
 *
 * Usage:
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
 */
export function promiseChecker() {
  const makeHandler = type => ((...args) => {
    const callback = args[0]
    assert.isAtMost(args.length, 1, "wrong number of arguments: " + args)
    if (isSetup) {
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
      isSetup = false
      return promise
    },
    check: () => {
      assert(!isSetup, "setup phase not done()")
      assert.equal(checkCount, checks.length,
        "wrong check count: " + checkCount + " != " + checks.length)
    },
  }
  const checks = []
  let isSetup = true
  let checkCount = 0
  return promise
}

export function rewire(__RewireAPI__, sets, callback) {
  const resets = _.map(sets, (value, key) => __RewireAPI__.__set__(key, value))
  try {
    callback()
  } finally {
    _.each(resets, reset => reset())
  }
}

