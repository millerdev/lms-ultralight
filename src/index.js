'use strict'
// This file does not get hot reloaded
// its better to put global resources in app.js

import './polyfills'
import axios from 'axios'
import React from 'react'
import { render } from 'react-dom'
import App from './app'

if (process.env.NODE_ENV === "development") {
  window.console.log('LMS_URL:', process.env.LMS_URL)
  axios.defaults.baseURL = process.env.LMS_URL
} else {
  axios.defaults.baseURL = ""
}

const root = document.getElementById('app')
const renderer = App => render(<App />, root)

renderer(App)
