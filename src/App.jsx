// src/App.jsx
import React, { useState } from 'react';
import './App.css';
import SwapInterface from './components/SwapInterface';
import HTCLSwapInterface from './components/HTCLSwapInterface';

function App() {
  const [activeInterface, setActiveInterface] = useState('htcl'); // 'htcl' or 'swap'

  const handleConnectWallet = () => {
    console.log('Connect wallet clicked');
    // Add wallet connection logic here
  };

  return (
    <div className="App">
      <button className="connect-wallet-btn" onClick={handleConnectWallet}>
        Connect Wallet
      </button>

      <main className="App-main">
        {/* Title */}
        <h1 className="app-title">Only Tokens</h1>

        {/* Interface Toggle */}
        <div className="interface-toggle">
          <button
            className={`toggle-btn ${activeInterface === 'htcl' ? 'active' : ''}`}
            onClick={() => setActiveInterface('htcl')}
          >
            🔗 HTCL Cross-Chain
          </button>
          <button
            className={`toggle-btn ${activeInterface === 'swap' ? 'active' : ''}`}
            onClick={() => setActiveInterface('swap')}
          >
            💱 Regular Swap
          </button>
        </div>

        {/* Content */}
        {activeInterface === 'htcl' ? (
          <HTCLSwapInterface />
        ) : (
          <SwapInterface />
        )}
      </main>
    </div>
  );
}

export default App;