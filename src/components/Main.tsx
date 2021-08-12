import React from 'react';
import { Route } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import Printer from './printer/Printer';

const allRoutes = [
  {
    path: '/printer',
    name: 'Printer',
    Component: Printer,
  },
];

const Main = () => {
  return (
    <div className="absolute inset-0 flex">
      <main className="flex flex-col flex-1 overflow-x-hidden overflow-y-auto">
        {allRoutes.map(({ path, name, Component }) => (
          <Route key={path} exact path={path}>
            <Component />
            <Helmet>
              <title>{name}</title>
            </Helmet>
          </Route>
        ))}
      </main>
    </div>
  );
};

export default Main;
