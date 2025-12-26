import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Immediate shim to prevent ReferenceErrors globally
(function() {
  if (typeof (window as any).process === 'undefined') {
    (window as any).process = { env: {} };
  }
})();

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error("Critical Error: Root element not found. The app cannot start.");
}