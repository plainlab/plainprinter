import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from 'react-router-dom';
import qs from 'qs';

import './App.css';
import './helpers/fontAwesome';
import Main from './components/printer/Main';
import Screen from './components/printer/Screen';

function MyApp() {
  const location = useLocation();
  const { search } = location;
  const so = qs.parse(search.slice(search.lastIndexOf('?') + 1));
  return so.page === 'screen' ? (
    <Screen select={so.select?.toString() || 'frame'} />
  ) : (
    <Main />
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="*" element={<MyApp />} />
      </Routes>
    </Router>
  );
}
