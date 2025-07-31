import React, { useState } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing';
import { SigningStargateClient } from '@cosmjs/stargate';

const CosmWasmInteraction = () => {
  const [walletAddress, setWalletAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);

  // Configuration
  const rpcEndpoint = 'https://osmosis-rpc.publicnode.com:443'; 
  const mnemonic = 'your-mnemonic-here';
  const contractAddress = 'cosmos1...';
  const prefix = 'cosmos';

  // Connect to wallet
  const connectWallet = async () => {
    try {
      const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix });
      const [{ address }] = await wallet.getAccounts();
      const client = await SigningCosmWasmClient.connectWithSigner(rpcEndpoint, wallet);
      setWalletAddress(address);
      setClient(client);
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
      const recipient = 'cosmos1recipientaddress'; // Replace with recipient address
      const amount = [{ denom: 'uatom', amount: '100000' }]; // e.g., 0.1 ATOM
      const stargateClient = await SigningStargateClient.connectWithSigner(rpcEndpoint, await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, { prefix }));
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
      <h2>Cosmos Interaction</h2>
      <button onClick={connectWallet} disabled={walletAddress}>
        {walletAddress ? `Connected: ${walletAddress.slice(0, 10)}...` : 'Connect Wallet'}
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
          Send 0.1 ATOM
        </button>
      </div>
      {txHash && <p>Transaction Hash: {txHash}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default CosmWasmInteraction;