global.chai = require('chai')
global.assert = chai.assert
global.expect = chai.expect

chai.should()
chai.config.includeStack = true

Set.prototype.toString = function () {
    return "Set([" + [...this] + "])"
}
Map.prototype.toString = function () {
    return "Map([" + [...this] + "])"
}

assert.equal = assert.strictEqual

require('./browser')

const { cleanup } = require('@testing-library/react')
afterEach(cleanup)
