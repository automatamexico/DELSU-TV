import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App'; // NO importes './index.css' en la opción CDN

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
