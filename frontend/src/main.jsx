import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Share from './pages/Share.jsx';
import './styles.css';

// Register the service worker (enables install + the Web Share Target).
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/share" element={<Share />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
