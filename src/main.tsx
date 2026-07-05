import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// INTERCEPTION GLOBALE DES APPELS D'API POUR L'APK MOBILE
const ORIGINAL_FETCH = window.fetch;
window.fetch = function (input, init) {
  // Si l'appel commence par "/api", on y greffe automatiquement l'IP locale de votre PC
  if (typeof input === 'string' && input.startsWith('/api')) {
    // ⚠️ REMPLACEZ CETTE IP PAR CELLE DE VOTRE PC (voir Partie 3)
    const API_BASE = 'http://192.168.1.250:3000'; 
    return ORIGINAL_FETCH(API_BASE + input, init);
  }
  return ORIGINAL_FETCH(input, init);
};

