// // Load Buffer polyfill first
// import { Buffer } from 'buffer';

// // Set up Buffer polyfill immediately
// if (typeof window !== 'undefined') {
//   window.Buffer = Buffer;
//   // Also set it on globalThis for broader compatibility
//   if (typeof globalThis !== 'undefined') {
//     globalThis.Buffer = Buffer;
//   }
// }

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
