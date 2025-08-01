// src/App.jsx
import React from 'react';
import './App.css';
import SwapInterface from './components/SwapInterface';

function App() {
  const handleConnectWallet = () => {
    console.log('Connect wallet clicked');
    // Add wallet connection logic here
  };

  return (
    <div className="App">
      <button className="connect-wallet-btn" onClick={handleConnectWallet}>
        Connect Wallet
      </button>
      <header className="App-header">
        <h1>Only Tokens</h1>
        <SwapInterface />
      </header>
    </div>
  );
}

export default App;