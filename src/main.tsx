import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadInitialState } from './state/AppContext';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

const initial = loadInitialState();

createRoot(root).render(
  <StrictMode>
    <App initial={initial} />
  </StrictMode>,
);
