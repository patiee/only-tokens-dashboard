// src/components/CosmWasmInteraction.jsx
import React, { useState } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { SigningStargateClient } from '@cosmjs/stargate';

const CosmWasmInteractionKeplr = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);

  // Configuration
  const rpcEndpoint = 'https://osmosis-rpc.publicnode.com:443'; 
  const chainId = 'osmo-test-5';
  const contractAddress = 'osmo1...'; 
  const prefix = 'osmo'; 

  // Connect to Keplr wallet
  const connectWallet = async () => {
    try {
      // Check if cosmos is installed
      if (!window.only || !window.only.cosmos) {
        throw new Error('Only Tokens wallet is not installed. Please install the Only Tokens extension.');
      }

      // Enable Keplr for the specified chain
      await window.only.cosmos.enable(chainId);

      // Get the offline signer
      const offlineSigner = window.only.cosmos.getOfflineSigner(chainId);

      // Get the user's address
      const accounts = await offlineSigner.getAccounts();
      const address = accounts[0].address;

      // Create a CosmWasm client
      const cosmWasmClient = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, offlineSigner);

      setWalletAddress(address);
      setClient(cosmWasmClient);
      setError('');
    } catch (err) {
      setError('Failed to connect wallet: ' + err.message);
    }
  };

  // Call a smart contract method
  const callContract = async () => {
    if (!client) {
      setError('Please connect wallet first');
      return;
    }
    try {
      const msg = { some_method: { param1: 'value' } }; // Replace with your contract method
      const result = await client.execute(
        walletAddress,
        contractAddress,
        msg,
        'auto',
        'Calling contract method'
      );
      setTxHash(result.transactionHash);
      setError('');
    } catch (err) {
      setError('Failed to call contract: ' + err.message);
    }
  };

  // Send a transaction (e.g., send tokens)
  const sendTransaction = async () => {
    if (!client) {
      setError('Please connect wallet first');
      return;
    }
    try {
      const recipient = 'osmo1recipientaddress'; // Replace with recipient address (Osmosis format)
      const amount = [{ denom: 'uosmo', amount: '100000' }]; // e.g., 0.1 OSMO (Osmosis native token)

      // Create a Stargate client for sending tokens
      const offlineSigner = window.keplr.getOfflineSigner(chainId);
      const stargateClient = await SigningStargateClient.connectWithSigner(rpcEndpoint, offlineSigner);

      const result = await stargateClient.sendTokens(
        walletAddress,
        recipient,
        amount,
        'auto',
        'Sending tokens'
      );
      setTxHash(result.transactionHash);
      setError('');
    } catch (err) {
      setError('Failed to send transaction: ' + err.message);
    }
  };

  return (
    <div>
      <h2>Cosmos Interaction (Keplr)</h2>
      <button onClick={connectWallet} disabled={walletAddress}>
        {walletAddress ? `Connected: ${walletAddress.slice(0, 10)}...` : 'Connect Keplr Wallet'}
      </button>
      <div>
        <h3>Smart Contract</h3>
        <button onClick={callContract} disabled={!walletAddress}>
          Call Contract Method
        </button>
      </div>
      <div>
        <h3>Send Transaction</h3>
        <button onClick={sendTransaction} disabled={!walletAddress}>
          Send 0.1 OSMO
        </button>
      </div>
      {txHash && <p>Transaction Hash: {txHash}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default CosmWasmInteractionKeplr;