import React from 'react';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Redirect,
} from 'react-router-dom';
import Main from './components/Main';
import './App.global.css';
import './helpers/fontAwesome';

export default function App() {
  return (
    <Router>
      <Switch>
        <Route path="/" component={Main} />
      </Switch>
      <Redirect from="*" to="/printer" />
    </Router>
  );
}
