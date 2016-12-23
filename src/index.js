'use strict';
// This file does not get hot reloaded
// its better to put global resources in app.js

import React from 'react';
import { render } from 'react-dom';
import App from './app';

const root = document.getElementById('app');
const renderer = App => render(<App />, root);

renderer(App);

if (module.hot) {
  module.hot.accept('./app', () => renderer(require('./app').default));
}
