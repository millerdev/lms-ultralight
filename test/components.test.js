import { render } from '@testing-library/react'
import React from 'react'

import * as mod from '../src/components'

describe('components', function () {
  describe('LiveSeekBar', function () {
    it('should load with elapsed time', function () {
      const { container } = render(<mod.LiveSeekBar
        component={mod.ProgressIndicator}
        elapsed={100}
        total={400}
      />)
      const progress = container.querySelector('.progress-indicator')
      assert.equal(progress.style.width, '25%')
    })
  })
})
