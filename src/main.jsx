import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

// Apply the saved theme before the first paint.
try {
  const saved = localStorage.getItem('lumiere-theme');
  if (saved) document.documentElement.dataset.theme = saved;
} catch (e) { /* storage unavailable */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
