describe('index', function () {
  const errors = []
  /* eslint-disable-next-line no-console */
  const originalError = console.error

  before(() => {
    global.localStorage = {getItem: () => null}

    // Mock matchMedia for MUI's useMediaQuery (needs addEventListener)
    global.window.matchMedia = () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
    })

    global.ResizeObserver = class ResizeObserver {
      constructor() {}
      observe() {}
      disconnect() {}
    }

    // Mock Element and HTMLDocument for semantic-ui-react and react-resize-detector
    global.Element = global.window.Element
    global.HTMLDocument = global.window.HTMLDocument

    /* eslint-disable-next-line no-console */
    console.error = (...args) => {
      errors.push(args.join(' '))
      // Don't call originalError to suppress warnings in test output
    }
  })

  after(() => {
    /* eslint-disable-next-line no-console */
    console.error = originalError

    delete global.HTMLDocument
    delete global.Element
    delete global.ResizeObserver
    delete global.window.ResizeObserver
    delete global.window.matchMedia
    delete global.localStorage
  })

  it("should render without errors", function () {
    const cleanups = []
    try {
      const appDiv = global.document.createElement('div')
      appDiv.id = 'app'
      global.document.body.appendChild(appDiv)
      cleanups.push(() => global.document.body.removeChild(appDiv))

      delete require.cache[require.resolve('../src/index')]
      cleanups.push(() => delete require.cache[require.resolve('../src/index')])
      require('../src/index')

      assert(!errors.length, `Should render without errors.\n\n${errors.join('\n')}`)
    } finally {
      cleanups.reverse()
      cleanups.forEach(cleanup => cleanup())
    }
  })
})
