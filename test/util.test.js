import _ from 'lodash'

import * as util from '../src/util'

describe("util", function () {
  _.each({
    "0:00": 0,
    "0:01": 1,
    "0:02": 2.1,
    "0:03": 3.9,
    "1:00": 60,
    "10:00": 10 * 60,
    "10:00:00": 10 * 60 * 60,
    "23:59:59": 24 * 60 * 60 - 1,
    "-0:01": -1,
    "-23:59:59": -(24 * 60 * 60 - 1),
  }, (input, output) => {
    it("formatDate(" + input + ") => " + output, function () {
      assert.equal(util.formatTime(input), output)
    })
  })

  describe("timer", () => {
    it("should report active", () => {
      const tx = util.timer()
      assert.isNotOk(tx.isActive(), "should not be active initially")

      tx.after(10000, () => {})
      assert.isOk(tx.isActive(), "should be active after adding timer")

      tx.clear()
      assert.isNotOk(tx.isActive(), "should not be active after clear")

      return tx.after(1, () => {
        assert.isNotOk(tx.isActive(), "should not be active after timeout")
      })
    })

    it("should not reject on clear", () => {
      const tx = util.timer()
      const promise = tx.after(1, () => true).catch(() => {
        assert(0, "unexpected rejection")
      }).then(value => {
        assert.isUndefined(value, "expected undefined resolution")
      })
      tx.clear()
      return promise
    })
  })

  describe("memoize", () => {
    it("should return cached value", () => {
      const mem = util.memoize(v => [v + 1])
      const result = mem(1)
      assert.deepEqual(result, [2])
      assert.strictEqual(mem(1), result)
    })

    it("should update on pass new args", () => {
      const mem = util.memoize((...args) => _.map(args, a => a + 1))
      const r1 = mem(1, 2)
      assert.deepEqual(r1, [2, 3])
      assert.strictEqual(mem(1, 2), r1)

      const r2 = mem(2, 4)
      assert.notEqual(r2, r1)
      assert.strictEqual(mem(2, 4), r2)

      const r3 = mem(1, 2)
      assert.notEqual(r3, r1)
      assert.deepEqual(r3, [2, 3])

      const r4 = mem(1, 2, 3)
      assert.notEqual(r4, r1)
      assert.deepEqual(r4, [2, 3, 4])
    })
  })
})