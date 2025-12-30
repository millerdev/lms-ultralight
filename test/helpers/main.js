global.chai = require('chai')
global.assert = chai.assert
global.expect = chai.expect

const Adapter = require('@wojtekmaj/enzyme-adapter-react-17')
require('enzyme').configure({adapter: new Adapter()})

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
