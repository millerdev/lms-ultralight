import React from 'react';
import { Render, Router, Route, IndexRoute } from 'jumpsuit';
import state from './state';
import Player from './player';

const App = props => (
  <Router>
    <Route path="/" component={Player} />
  </Router>
);

Render(state, <App />);
