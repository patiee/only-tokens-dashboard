// src/App.jsx
import React from 'react';
import './App.css';
import SwapInterface from './components/SwapInterface';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Only Tokens</h1>
        <SwapInterface />
      </header>
    </div>
  );
}

export default App;