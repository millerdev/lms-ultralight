'use strict'
/* global LMS_URL */
// This file does not get hot reloaded
// its better to put global resources in app.js

import React from 'react'
import { render } from 'react-dom'
import App, { init } from './app'

if (process.env.NODE_ENV === "development") {
  window.console.log('LMS_URL:', LMS_URL)
  require('axios').defaults.baseURL = LMS_URL
}

const root = document.getElementById('app')
const renderer = App => render(<App />, root)

renderer(App)

init()

// hot reloading currently done by BrowserSync?
//if (module.hot) {
//  module.hot.accept('./app', () => {
//    app = require('./app')
//    renderer(app.default)
//    app.start()
//  })
//}
