require('@babel/register')

process.env.NODE_ENV = 'test'

const { JSDOM } = require('jsdom')
const { window } = new JSDOM('')
global.window = window
global.document = window.document
global.HTMLElement = window.HTMLElement  // https://github.com/chaijs/type-detect/issues/98
Object.defineProperty(global, 'navigator', {
  value: { userAgent: 'node.js' },
  writable: true,
  configurable: true,
})

// MUI's useMediaQuery (used by MediaQuery) needs matchMedia with
// addEventListener; jsdom's built-in doesn't provide one.
window.matchMedia = () => ({
  matches: false,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
})
