import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Note: not using StrictMode so the Three.js scenes mount exactly once
// (StrictMode double-invokes effects in dev, which spins up two WebGL contexts).
createRoot(document.getElementById('root')).render(<App />);
