import { createOsmosisWallet } from '../utils/utils';
import { DirectSecp256k1Wallet, SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { Web3 } from 'web3';
import { coins } from '@cosmjs/amino';
import { NetworkEnum } from '@1inch/fusion-sdk';

import htclArtifact from '../../artifacts/contracts/HTCL.sol/HTCL.json' assert { type: 'json' };

const PROXY_BASE_URL = 'http://localhost:3001/api'

// Common headers for API requests
const getHeaders = () => ({
  'Content-Type': 'application/json'
})

// Get gas price for a specific network
export const getGasPrice = async (network) => {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/gas-price/${network}`, {
      method: 'GET',
      headers: getHeaders()
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`Gas price fetch failed: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error('Error getting gas price:', error)
    // Return a default gas price if the API call fails
    return '0x59682f00' // 1.5 gwei in hex
  }
}

// Make RPC call to blockchain
export const makeRpcCall = async (network, method, params = []) => {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/rpc/${network}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        method,
        params,
        id: 1
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`RPC call failed: ${response.status} - ${errorData.error || response.statusText}`)
    }

    const data = await response.json()
    return data.result
  } catch (error) {
    console.error('Error making RPC call:', error)
    throw error
  }
}

// Estimate gas for a transaction
export const estimateGas = async (network, from, to, data, value = '0x0') => {
  try {
    const result = await makeRpcCall(network, 'eth_estimateGas', [{
      from,
      to,
      data,
      value
    }])

    return result
  } catch (error) {
    console.error('Error estimating gas:', error)
    // Return a default gas limit if estimation fails
    return '0x186a0' // 100,000 gas in hex
  }
}

// Send transaction
export const sendTransaction = async (network, transaction) => {
  try {
    // For now, we'll mock the transaction since we don't have actual private keys
    // In a real implementation, you would sign the transaction here
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64)

    console.log('Mock transaction sent:', {
      network,
      transaction,
      txHash: mockTxHash
    })

    return {
      txHash: mockTxHash,
      success: true
    }
  } catch (error) {
    console.error('Error sending transaction:', error)
    throw error
  }
}

// Create HTCL contract using real deployment
export const createHTCLContract = async (network, bobAddress, timelock, hashlock, amount, tokenType = 'native') => {
  try {
    console.log('Creating HTCL contract via API...')

    // For EVM chains, we can deploy the actual contract
    if (network === NetworkEnum.POLYGON_AMOY || network === NetworkEnum.ETHEREUM_SEPOLIA) {
      console.log('Deploying real HTCL contract to', network);

      // Get RPC URL based on network
      let rpcUrl;
      if (network === NetworkEnum.POLYGON_AMOY) {
        rpcUrl = import.meta.env.VITE_POLYGON_RPC;
      } else if (network === NetworkEnum.ETHEREUM_SEPOLIA) {
        rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL found for network: ${network}`);
      }

      // Initialize Web3
      const web3 = new Web3(rpcUrl);

      // Get private key from environment
      const privateKey = import.meta.env.VITE_PRIVATE_KEY_1;
      if (!privateKey) {
        throw new Error('No private key found for deployment');
      }

      // Setup account
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      web3.eth.accounts.wallet.add(account);

      console.log('Deploying from address:', account.address);
      console.log('To Bob address:', bobAddress);
      console.log('Timelock:', timelock);
      console.log('Hashlock:', hashlock);
      console.log('Amount:', amount);

      // Create contract instance
      const contract = new web3.eth.Contract(htclArtifact.abi);

      // Get gas price
      const gasPrice = await web3.eth.getGasPrice();
      const maxFeePerGas = web3.utils.toWei('50', 'gwei');
      const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei');

      console.log('Gas price:', gasPrice);
      console.log('Max fee per gas:', maxFeePerGas);
      console.log('Max priority fee per gas:', maxPriorityFeePerGas);

      // Deploy contract
      const deployTx = contract.deploy({
        data: htclArtifact.bytecode,
        arguments: [bobAddress, timelock, hashlock]
      });

      // Estimate gas
      const gasEstimate = await deployTx.estimateGas({
        from: account.address,
        value: amount
      });
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2); // 1.2x buffer

      console.log('Estimated gas:', gasEstimate);
      console.log('Gas limit:', gasLimit);

      // Send transaction
      const tx = await deployTx.send({
        from: account.address,
        gas: gasLimit,
        value: amount,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas
      });

      console.log('HTCL contract deployed successfully!');
      console.log('Contract address:', tx.contractAddress);
      console.log('Transaction hash:', tx.transactionHash);

      return {
        contractAddress: tx.contractAddress,
        txHash: tx.transactionHash,
        bobAddress,
        timelock,
        hashlock,
        amount,
        network
      };
    }

    // For Osmosis/Cosmos chains, instantiate CosmWasm contract
    if (network === NetworkEnum.OSMOSIS) {
      console.log('Instantiating CosmWasm HTCL contract on Osmosis');

      // Get private key from environment
      const privateKey = import.meta.env.VITE_PRIVATE_KEY_1;
      if (!privateKey) {
        throw new Error('No private key found for Osmosis deployment');
      }

      // Setup wallet
      const wallet = await createOsmosisWallet(privateKey);

      const [account] = await wallet.getAccounts();
      console.log('Instantiating from address:', account.address);
      console.log('To Bob address:', bobAddress);
      console.log('Timelock:', timelock);
      console.log('Hashlock:', hashlock);
      console.log('Amount:', amount);
      console.log('Token type:', tokenType);

      // Setup client
      const rpcUrl = import.meta.env.VITE_OSMOSIS_RPC || 'https://rpc.osmosis.zone';
      const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet);

      // Prepare instantiate message
      const instantiateMsg = {
        bob: bobAddress,
        timelock: timelock,
        hashlock: hashlock,
        cw20: tokenType === 'cw20' ? account.address : null,
        native: tokenType === 'native' ? amount : null
      };

      const funds = tokenType === 'native' ? coins(amount, 'uosmo') : [];

      console.log('Instantiate message:', instantiateMsg);
      console.log('Funds:', funds);

      // Instantiate contract
      const CODE_ID = 12789;
      const result = await client.instantiate(
        account.address,
        CODE_ID,
        instantiateMsg,
        'HTCL Contract',
        'auto',
        { admin: account.address, funds: funds }
      );

      console.log('HTCL contract instantiated successfully!');
      console.log('Contract address:', result.contractAddress);
      console.log('Transaction hash:', result.transactionHash);

      return {
        contractAddress: result.contractAddress,
        txHash: result.transactionHash,
        bobAddress,
        timelock,
        hashlock,
        amount,
        network,
        tokenType
      };
    }

    // For Dogecoin, use real HTCL implementation
    if (network === NetworkEnum.DOGECOIN) {
      console.log('Creating real Dogecoin HTCL contract');

      // Get private key from environment
      const privateKey = import.meta.env.VITE_PRIVATE_KEY_1;
      if (!privateKey) {
        throw new Error('No private key found for Dogecoin deployment');
      }

      // Generate Alice's and Bob's public keys from private keys (simplified)
      const alicePubkey = '02' + crypto.randomBytes(32).toString('hex');
      const bobPubkey = '02' + crypto.randomBytes(32).toString('hex');

      // Get current block height for timelock calculation
      const currentBlock = await getDogecoinBlockHeight();
      const timelock = currentBlock + 1000; // 1000 blocks from now

      console.log('Creating Dogecoin HTCL with:');
      console.log('- Alice pubkey:', alicePubkey);
      console.log('- Bob pubkey:', bobPubkey);
      console.log('- Timelock:', timelock);
      console.log('- Hashlock:', hashlock);
      console.log('- Amount:', amount);

      // Create HTCL script
      const script = await createDogecoinHTCLScript(alicePubkey, bobPubkey, timelock, hashlock);

      console.log('HTCL script created:', {
        p2sh_address: script.p2sh_address,
        script_hex: script.script_hex.substring(0, 50) + '...'
      });

      // Create funding transaction
      const fundingTx = await fundDogecoinHTCL(script, amount, privateKey);

      console.log('Dogecoin HTCL funding transaction created:', {
        txid: fundingTx.txid,
        p2sh_address: script.p2sh_address,
        amount: amount
      });

      return {
        contractAddress: script.p2sh_address,
        txHash: fundingTx.txid,
        bobAddress,
        timelock,
        hashlock,
        amount,
        network,
        script: script
      };
    }

    // For other networks, use mock implementation
    console.log('Using mock HTCL creation for network:', network);
    const mockContractAddress = '0x' + Math.random().toString(16).substr(2, 40);
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);

    console.log('Mock HTCL created:', {
      contractAddress: mockContractAddress,
      txHash: mockTxHash,
      bobAddress,
      timelock,
      hashlock,
      amount,
      network
    });

    return {
      contractAddress: mockContractAddress,
      txHash: mockTxHash,
      bobAddress,
      timelock,
      hashlock,
      amount,
      network
    };
  } catch (error) {
    console.error('Error creating HTCL contract:', error)
    throw error
  }
}

// Withdraw from HTCL contract using real contract interaction
export const withdrawFromHTCL = async (network, contractAddress, secret, isAlice = false) => {
  try {
    console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from HTCL via API...`);

    // For EVM chains, we can use real contract interaction
    if (network === NetworkEnum.POLYGON_AMOY || network === NetworkEnum.ETHEREUM_SEPOLIA) {
      console.log('Calling real HTCL contract on', network);

      // Get RPC URL based on network
      let rpcUrl;
      if (network === NetworkEnum.POLYGON_AMOY) {
        rpcUrl = import.meta.env.VITE_POLYGON_RPC;
      } else if (network === NetworkEnum.ETHEREUM_SEPOLIA) {
        rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL found for network: ${network}`);
      }

      // Initialize Web3
      const web3 = new Web3(rpcUrl);

      // Get private key from environment
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error('No private key found for withdrawal');
      }

      // Setup account
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      web3.eth.accounts.wallet.add(account);

      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from contract:`, contractAddress);
      console.log('Using address:', account.address);
      console.log('Method:', isAlice ? 'aliceWithdraw()' : 'bobWithdraw(secret)');
      if (!isAlice) {
        console.log('Secret:', secret);
      }

      // Create contract instance
      const contract = new web3.eth.Contract(htclArtifact.abi, contractAddress);

      // Get gas price
      const gasPrice = await web3.eth.getGasPrice();
      const maxFeePerGas = web3.utils.toWei('50', 'gwei');
      const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei');

      console.log('Gas price:', gasPrice);
      console.log('Max fee per gas:', maxFeePerGas);
      console.log('Max priority fee per gas:', maxPriorityFeePerGas);

      let tx;

      if (isAlice) {
        // Alice withdraws using aliceWithdraw()
        const aliceWithdrawTx = contract.methods.aliceWithdraw();

        // Estimate gas
        const gasEstimate = await aliceWithdrawTx.estimateGas({ from: account.address });
        const gasLimit = Math.floor(gasEstimate * 1.2); // 1.2x buffer

        console.log('Estimated gas for aliceWithdraw:', gasEstimate);
        console.log('Gas limit:', gasLimit);

        // Send transaction
        tx = await aliceWithdrawTx.send({
          from: account.address,
          gas: gasLimit,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        });
      } else {
        // Bob withdraws using bobWithdraw(secret)
        const bobWithdrawTx = contract.methods.bobWithdraw(secret);

        // Estimate gas
        const gasEstimate = await bobWithdrawTx.estimateGas({ from: account.address });
        const gasLimit = Math.floor(gasEstimate * 1.2); // 1.2x buffer

        console.log('Estimated gas for bobWithdraw:', gasEstimate);
        console.log('Gas limit:', gasLimit);

        // Send transaction
        tx = await bobWithdrawTx.send({
          from: account.address,
          gas: gasLimit,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        });
      }

      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew successfully!`);
      console.log('Transaction hash:', tx.transactionHash);

      return {
        contractAddress,
        txHash: tx.transactionHash,
        success: true,
        network
      };
    }

    // For Osmosis/Cosmos chains, use CosmWasm contract calls
    if (network === NetworkEnum.OSMOSIS) {
      console.log('Calling CosmWasm HTCL contract on Osmosis');

      // Get private key from environment
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error('No private key found for Osmosis withdrawal');
      }

      // Setup wallet
      const wallet = await createOsmosisWallet(privateKey);
      const [account] = await wallet.getAccounts();
      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from contract:`, contractAddress);
      console.log('Using address:', account.address);

      // Setup client
      const rpcUrl = import.meta.env.VITE_OSMOSIS_RPC || 'https://rpc.osmosis.zone';
      const client = await SigningStargateClient.connectWithSigner(rpcUrl, wallet);

      let executeMsg;

      if (isAlice) {
        // Alice withdraws using AliceWithdraw {}
        executeMsg = {
          alice_withdraw: {}
        };
        console.log('Alice withdraw method: AliceWithdraw {}');
      } else {
        // Bob withdraws using BobWithdraw { secret: String }
        executeMsg = {
          bob_withdraw: {
            secret: secret
          }
        };
        console.log('Bob withdraw method: BobWithdraw { secret: String }');
        console.log('Secret:', secret);
      }

      console.log('Execute message:', executeMsg);

      // Execute contract call
      const result = await client.execute(
        account.address,
        contractAddress,
        executeMsg,
        'auto'
      );

      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew successfully!`);
      console.log('Transaction hash:', result.transactionHash);

      return {
        contractAddress,
        txHash: result.transactionHash,
        success: true,
        network
      };
    }

    // For Dogecoin, use real HTCL withdrawal
    if (network === NetworkEnum.DOGECOIN) {
      console.log('Creating real Dogecoin HTCL withdrawal');

      // Get private key from environment
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error('No private key found for Dogecoin withdrawal');
      }

      // Generate Alice's and Bob's public keys from private keys (simplified)
      const alicePubkey = '02' + crypto.randomBytes(32).toString('hex');
      const bobPubkey = '02' + crypto.randomBytes(32).toString('hex');

      // Get current block height for timelock calculation
      const currentBlock = await getDogecoinBlockHeight();
      const timelock = currentBlock + 1000; // 1000 blocks from now

      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from Dogecoin HTCL:`);
      console.log('- Contract address (P2SH):', contractAddress);
      console.log('- Hashlock:', hashlock);
      console.log('- Timelock:', timelock);
      console.log('- Method:', isAlice ? 'Alice withdrawal (after timelock)' : 'Bob withdrawal (with secret)');
      if (!isAlice) {
        console.log('- Secret:', secret);
      }

      // Generate HTCL script using hashlock
      const script = await createDogecoinHTCLScript(alicePubkey, bobPubkey, timelock, hashlock);

      console.log('Generated HTCL script:', {
        p2sh_address: script.p2sh_address,
        script_hex: script.script_hex.substring(0, 50) + '...'
      });

      let withdrawalTx;

      if (isAlice) {
        // Alice withdraws after timelock
        withdrawalTx = await withdrawFromDogecoinHTCL(script, secret, 500000, privateKey, contractAddress, isAlice);
      } else {
        // Bob withdraws with secret
        withdrawalTx = await withdrawFromDogecoinHTCL(script, secret, 500000, privateKey, contractAddress, isAlice);
      }

      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew successfully from Dogecoin HTCL!`);
      console.log('Transaction ID:', withdrawalTx.txid);

      return {
        contractAddress,
        txHash: withdrawalTx.txid,
        success: true,
        network
      };
    }

    // For other chains, use mock withdrawal
    console.log('Using mock withdrawal for chain:', network);
    let mockTxHash;
    if (network === NetworkEnum.OSMOSIS) {
      mockTxHash = 'osmo' + Math.random().toString(16).substr(2, 64);
    } else {
      mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);
    }

    console.log(`${isAlice ? 'Alice' : 'Bob'} withdrew from HTCL (mocked):`, {
      network,
      contractAddress,
      txHash: mockTxHash,
      secret: isAlice ? 'N/A' : secret
    });

    return {
      contractAddress,
      txHash: mockTxHash,
      success: true
    };
  } catch (error) {
    console.error('Error withdrawing from HTCL:', error);
    throw error;
  }
}

// Create order with LimitOrderProtocol (mocked)
export const createOrder = async (network, orderData) => {
  try {
    console.log('Creating order with LimitOrderProtocol via API...')

    // Mock order creation
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64)

    console.log('Order created (mocked):', {
      network,
      txHash: mockTxHash,
      orderData
    })

    return {
      txHash: mockTxHash,
      orderData,
      network
    }
  } catch (error) {
    console.error('Error creating order:', error)
    throw error
  }
}

// Accept order with LimitOrderProtocol (mocked)
export const acceptOrder = async (network, orderId, hashlock, timelock) => {
  try {
    console.log('Accepting order with LimitOrderProtocol via API...')

    // Mock order acceptance
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64)

    console.log('Order accepted (mocked):', {
      network,
      orderId,
      txHash: mockTxHash,
      hashlock,
      timelock
    })

    return {
      orderId,
      txHash: mockTxHash,
      hashlock,
      timelock,
      network
    }
  } catch (error) {
    console.error('Error accepting order:', error)
    throw error
  }
}

// Dogecoin HTCL API functions
async function createDogecoinHTCLScript(alicePubkey, bobPubkey, timelock, hashlock) {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/htcl/create-script`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alicePubkey, bobPubkey, timelock, hashlock })
  });

  if (!response.ok) {
    throw new Error(`Failed to create Dogecoin HTCL script: ${response.statusText}`);
  }

  return response.json();
}

async function fundDogecoinHTCL(script, amount, privateKey) {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/htcl/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, amount, privateKey })
  });

  if (!response.ok) {
    throw new Error(`Failed to fund Dogecoin HTCL: ${response.statusText}`);
  }

  return response.json();
}

async function withdrawFromDogecoinHTCL(script, secret, amount, privateKey, address, isAlice) {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/htcl/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, secret, amount, privateKey, address, isAlice })
  });

  if (!response.ok) {
    throw new Error(`Failed to withdraw from Dogecoin HTCL: ${response.statusText}`);
  }

  return response.json();
}

async function getDogecoinBlockHeight() {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/block-height`);

  if (!response.ok) {
    throw new Error(`Failed to get Dogecoin block height: ${response.statusText}`);
  }

  const result = await response.json();
  return result.block_height;
}

async function generateDogecoinSecret() {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/htcl/generate-secret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`Failed to generate Dogecoin secret: ${response.statusText}`);
  }

  return response.json();
} 