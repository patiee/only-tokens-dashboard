// src/App.jsx
import React from 'react';
import './App.css';
import CosmWasmInteraction from './components/CosmWasmInteraction';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Cosmos React App</h1>
        <CosmWasmInteraction />
      </header>
    </div>
  );
}

export default App;