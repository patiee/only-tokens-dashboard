// src/components/CosmWasmInteraction.jsx
import React, { useEffect, useState } from 'react';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { SigningStargateClient } from '@cosmjs/stargate';
import { 
  isOnlyTokensExtensionAvailable, 
  getOnlyTokensExtension, 
  waitForExtension, 
  debugExtensionStatus,
  tryEstablishExtensionCommunication
} from '../utils/extensionUtils';

function CosmWasmInteraction() {
  const [walletAddress, setWalletAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [extensionAvailable, setExtensionAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Configuration
  const rpcEndpoint = 'https://osmosis-rpc.publicnode.com:443'; 
  const chainId = 'osmo-test-5';
  const contractAddress = 'osmo1...'; // Replace with your actual contract address

  // Check if the Only Tokens extension is available
  useEffect(() => {
    const checkExtension = async () => {
      try {
        // Check if we're in a browser environment
        if (typeof window === 'undefined') {
          setExtensionAvailable(false);
          return;
        }

        // Debug extension status
        debugExtensionStatus();

        // Check if the extension is available
        if (isOnlyTokensExtensionAvailable()) {
          setExtensionAvailable(true);
          console.log('Only Tokens extension detected');
        } else {
          setExtensionAvailable(false);
          console.log('Only Tokens extension not detected');
          
          // Try to establish communication with the extension
          const communicationEstablished = await tryEstablishExtensionCommunication();
          if (communicationEstablished) {
            setExtensionAvailable(true);
            console.log('Only Tokens extension communication established');
          } else {
            // Fallback: wait for extension to become available
            const extensionFound = await waitForExtension(3000);
            if (extensionFound) {
              setExtensionAvailable(true);
              console.log('Only Tokens extension found after waiting');
            }
          }
        }
      } catch (err) {
        console.error('Error checking extension:', err);
        setExtensionAvailable(false);
      }
    };

    // Check immediately
    checkExtension();
  }, []);

  const connectWallet = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('This application must run in a browser environment');
      }

      // Check if the extension is available
      const extension = getOnlyTokensExtension();
      if (!extension) {
        throw new Error(
          'Only Tokens wallet extension is not installed or not accessible. ' +
          'Please install the Only Tokens Chrome extension and refresh the page.'
        );
      }

      console.log('Attempting to connect to Only Tokens extension...');

      // Enable the extension for the specified chain
      await extension.enable(chainId);
      console.log('Extension enabled for chain:', chainId);

      // Get the offline signer
      const offlineSigner = extension.getOfflineSigner(chainId);
      console.log('Offline signer obtained');

      // Get the user's address
      const accounts = await offlineSigner.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please make sure you have accounts in the Only Tokens extension.');
      }
      
      const address = accounts[0].address;
      console.log('Connected address:', address);

      // Create a CosmWasm client
      const cosmWasmClient = await SigningCosmWasmClient.connectWithSigner(
        rpcEndpoint, 
        offlineSigner
      );
      console.log('CosmWasm client created successfully');

      setWalletAddress(address);
      setClient(cosmWasmClient);
      setIsConnected(true);
      setExtensionAvailable(true);
      
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(`Failed to connect wallet: ${err.message}`);
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Call a smart contract method
  const callContract = async () => {
    if (!client) {
      setError('Please connect wallet first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
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
      console.log('Contract call successful:', result.transactionHash);
    } catch (err) {
      console.error('Error calling contract:', err);
      setError(`Failed to call contract: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Send a transaction (e.g., send tokens)
  const sendTransaction = async () => {
    if (!client) {
      setError('Please connect wallet first');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const recipient = 'osmo1recipientaddress'; // Replace with recipient address (Osmosis format)
      const amount = [{ denom: 'uosmo', amount: '100000' }]; // e.g., 0.1 OSMO

      // Get the offline signer again to ensure it's still valid
      const extension = getOnlyTokensExtension();
      if (!extension) {
        throw new Error('Only Tokens extension is not available');
      }
      const offlineSigner = extension.getOfflineSigner(chainId);
      const stargateClient = await SigningStargateClient.connectWithSigner(
        rpcEndpoint, 
        offlineSigner
      );

      const result = await stargateClient.sendTokens(
        walletAddress,
        recipient,
        amount,
        'auto',
        'Sending tokens'
      );
      setTxHash(result.transactionHash);
      console.log('Transaction sent successfully:', result.transactionHash);
    } catch (err) {
      console.error('Error sending transaction:', err);
      setError(`Failed to send transaction: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress('');
    setClient(null);
    setIsConnected(false);
    setTxHash('');
    setError('');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Only Tokens Dashboard</h2>
      
      {/* Extension Status */}
      <div style={{ 
        padding: '10px', 
        marginBottom: '20px',
        backgroundColor: extensionAvailable ? '#e8f5e8' : '#ffe8e8',
        border: `1px solid ${extensionAvailable ? '#4caf50' : '#f44336'}`,
        borderRadius: '4px'
      }}>
        <strong>Extension Status:</strong> {extensionAvailable ? 'Available' : 'Not Available'}
      </div>

      {/* Connection Status */}
      <div style={{ 
        padding: '10px', 
        marginBottom: '20px',
        backgroundColor: isConnected ? '#e8f5e8' : '#fff3cd',
        border: `1px solid ${isConnected ? '#4caf50' : '#ffc107'}`,
        borderRadius: '4px'
      }}>
        <strong>Wallet Status:</strong> {isConnected ? 'Connected' : 'Not Connected'}
        {isConnected && walletAddress && (
          <div style={{ marginTop: '5px', fontSize: '0.9em' }}>
            Address: {walletAddress}
          </div>
        )}
      </div>

      {/* Connect/Disconnect Button */}
      <div style={{ marginBottom: '20px' }}>
        {!isConnected ? (
          <button 
            onClick={connectWallet} 
            disabled={isLoading || !extensionAvailable}
            style={{
              padding: '10px 20px',
              backgroundColor: extensionAvailable ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: extensionAvailable ? 'pointer' : 'not-allowed'
            }}
          >
            {isLoading ? 'Connecting...' : 'Connect Only Tokens Wallet'}
          </button>
        ) : (
          <button 
            onClick={disconnectWallet}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Disconnect Wallet
          </button>
        )}
      </div>

      {/* Contract Interaction */}
      {isConnected && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Smart Contract Interaction</h3>
          <button 
            onClick={callContract} 
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            {isLoading ? 'Processing...' : 'Call Contract Method'}
          </button>
        </div>
      )}

      {/* Send Transaction */}
      {isConnected && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Send Transaction</h3>
          <button 
            onClick={sendTransaction} 
            disabled={isLoading}
            style={{
              padding: '10px 20px',
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isLoading ? 'Processing...' : 'Send 0.1 OSMO'}
          </button>
        </div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px'
        }}>
          <strong>Transaction Hash:</strong> {txHash}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div style={{ 
          padding: '10px', 
          marginBottom: '20px',
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          color: '#721c24'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Instructions */}
      {!extensionAvailable && (
        <div style={{ 
          padding: '15px', 
          marginTop: '20px',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '4px'
        }}>
          <h4>How to Install Only Tokens Extension:</h4>
          <ol>
            <li>Install the Only Tokens Chrome extension</li>
            <li>Create or import your wallet</li>
            <li>Refresh this page</li>
            <li>Click "Connect Only Tokens Wallet"</li>
          </ol>
          <div style={{ marginTop: '10px' }}>
            <button 
              onClick={() => window.location.reload()}
              style={{
                padding: '8px 16px',
                backgroundColor: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                marginRight: '10px'
              }}
            >
              Refresh Page
            </button>
            <a 
              href="/test-extension.html" 
              target="_blank"
              style={{
                padding: '8px 16px',
                backgroundColor: '#28a745',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
                display: 'inline-block'
              }}
            >
              Test Extension Page
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default CosmWasmInteraction;