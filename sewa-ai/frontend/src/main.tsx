// SEWA AI — frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// ── Robust Splash Removal ──────────────────────────────────────
const hideSplash = () => {
  const win = window as any;
  // Call known functions
  win.__sewa_hide_splash?.();
  win.__hideSplash?.();
  
  // Directly manipulate DOM just in case
  ['splash', 'loading-splash'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      setTimeout(() => el.remove(), 600);
    }
  });

  // Handle by class if ID missing
  document.querySelectorAll('.sewa-splash').forEach((el: any) => {
    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
  });
};

// Hide on mount and with a safety timeout
requestAnimationFrame(() => requestAnimationFrame(hideSplash));
setTimeout(hideSplash, 500);
setTimeout(hideSplash, 2000); // Final safety fallback

