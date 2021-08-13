import React from 'react';
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import qs from 'qs';

import './App.global.css';
import './helpers/fontAwesome';
import Main from './components/printer/Main';
import Screen from './components/printer/Screen';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route
          path="*"
          render={(props) => {
            const { search } = props.location;
            const so = qs.parse(search.slice(search.lastIndexOf('?') + 1));
            return so.page === 'screen' ? (
              <Screen select={so.select?.toString() || 'frame'} />
            ) : (
              <Main />
            );
          }}
        />
      </Switch>
    </Router>
  );
}
