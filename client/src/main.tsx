import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Landing from './pages/Landing';
import './index.css';

const isApp = window.location.pathname.startsWith('/app');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isApp ? <App /> : <Landing />}
  </React.StrictMode>
);
