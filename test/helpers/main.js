global.chai = require('chai')
global.assert = chai.assert
global.expect = chai.expect

chai.should()
chai.config.includeStack = true
chai.use(require('chai-immutable'))

assert.equal = assert.strictEqual

require('./browser')
