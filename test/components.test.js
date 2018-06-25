import { shallow } from 'enzyme'
import React from 'react'

import * as mod from '../src/components'

describe('components', function () {
  describe('LiveSeekBar', function () {
    it('should load with elapsed time', function () {
      const dom = shallow(<mod.LiveSeekBar
        component={mod.ProgressIndicator}
        elapsed={100}
        total={400}
      />)
      const progress = dom.find("ProgressIndicator")
      assert.deepEqual(progress.props().elapsed, 100)
    })
  })
})


