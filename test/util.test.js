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
})