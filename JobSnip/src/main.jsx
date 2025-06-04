import React from 'react';
import ReactDOM from 'react-dom/client';
import JobSnip from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <div className="min-h-screen bg-gray-100">
      <JobSnip />
    </div>
  </React.StrictMode>
);
