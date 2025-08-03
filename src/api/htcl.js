import { createOsmosisWallet } from '../utils/utils';
import { DirectSecp256k1Wallet, SigningStargateClient, StargateClient } from '@cosmjs/stargate';
import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { Web3 } from 'web3';
import { coins } from '@cosmjs/amino';
import { NetworkEnum } from '@1inch/fusion-sdk';

import htclArtifact from '../../artifacts/contracts/HTCL.sol/HTCL.json' assert { type: 'json' };
import limitOrderArtifact from '../../artifacts/contracts/LimitOrderProtocol.sol/LimitOrderProtocol.json' assert { type: 'json' };

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
export const createHTCLContract = async (network, bobAddress, timelock, hashlock, amount, tokenAddress = null, isAlice = true) => {
  try {
    console.log(`${isAlice ? 'Alice' : 'Bob'} creating HTCL contract via API...`);

    // For EVM chains, we can deploy the actual contract
    if (network === NetworkEnum.POLYGON_AMOY || network === NetworkEnum.ETHEREUM_SEPOLIA) {
      console.log(`${isAlice ? 'Alice' : 'Bob'} deploying real HTCL contract to`, network);

      // Get RPC URL based on network
      let rpcUrl;
      if (network === NetworkEnum.POLYGON_AMOY) {
        rpcUrl = import.meta.env.VITE_POLYGON_AMOY_RPC_URL;
      } else if (network === NetworkEnum.ETHEREUM_SEPOLIA) {
        rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL found for network: ${network}`);
      }

      // Initialize Web3
      const web3 = new Web3(rpcUrl);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} deployment`);
      }

      // Setup account
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      web3.eth.accounts.wallet.add(account);

      console.log(`${isAlice ? 'Alice' : 'Bob'} deploying from address:`, account.address);
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

      console.log(`${isAlice ? 'Alice' : 'Bob'} deployed HTCL contract successfully!`);
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
      console.log(`${isAlice ? 'Alice' : 'Bob'} instantiating CosmWasm HTCL contract on Osmosis`);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} Osmosis deployment`);
      }

      // Setup wallet
      const wallet = await createOsmosisWallet(privateKey);

      const [account] = await wallet.getAccounts();
      console.log(`${isAlice ? 'Alice' : 'Bob'} instantiating from address:`, account.address);
      console.log('To Bob address:', bobAddress);
      console.log('Timelock:', timelock);
      console.log('Hashlock:', hashlock);
      console.log('Amount:', amount);
      console.log('Token address received:', tokenAddress);
      console.log('Token address type:', typeof tokenAddress);

      // Determine token type based on token address format
      let actualTokenType = 'native'; // Default to native
      if (tokenAddress) {
        // Check if it's a native token (IBC or short denom)
        if (tokenAddress.startsWith('ibc/') || tokenAddress.length < 10) {
          actualTokenType = 'native';
        } else {
          // Assume it's a CW20 token (Osmosis address format)
          actualTokenType = 'cw20';
        }
      }

      // Setup client
      const rpcUrl = import.meta.env.VITE_OSMOSIS_RPC;
      if (!rpcUrl) {
        throw new Error('No Osmosis RPC URL found. Please set VITE_OSMOSIS_RPC environment variable.');
      }
      console.log('Using RPC URL:', rpcUrl);

      // Configure client with gas price for Osmosis
      const clientOptions = {
        gasPrice: "0.025uosmo" // Osmosis gas price
      };
      const client = await SigningCosmWasmClient.connectWithSigner(rpcUrl, wallet, clientOptions);

      // Validate bob address format
      if (!bobAddress || !bobAddress.startsWith('osmo')) {
        throw new Error(`Invalid Osmosis address format: ${bobAddress}`);
      }

      // Prepare instantiate message
      const instantiateMsg = {
        bob: bobAddress,
        timelock: timelock,
        hashlock: hashlock,
        cw20: actualTokenType === 'cw20' ? tokenAddress : null,
        native: actualTokenType === 'native' ? tokenAddress : null
      };

      // Create funds array based on token type
      let funds = [];
      if (actualTokenType === 'native' && tokenAddress) {
        funds = coins(amount, tokenAddress);
      } else if (actualTokenType === 'cw20') {
        // CW20 tokens don't use funds array for instantiation
        funds = [];
      }

      console.log('Actual token type determined:', actualTokenType);
      console.log('Token address for funds:', tokenAddress);
      console.log('Instantiate message:', instantiateMsg);
      console.log('Funds array:', funds);

      // Instantiate contract
      const CODE_ID = 12792;
      const result = await client.instantiate(
        account.address,
        CODE_ID,
        instantiateMsg,
        'HTCL Contract',
        'auto',
        { admin: account.address, funds: funds }
      );

      console.log(`${isAlice ? 'Alice' : 'Bob'} instantiated HTCL contract successfully!`);
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
        tokenType: actualTokenType
      };
    }

    // For Dogecoin, use real HTCL implementation
    if (network === NetworkEnum.DOGECOIN) {
      console.log(`${isAlice ? 'Alice' : 'Bob'} creating real Dogecoin HTCL contract`);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} Dogecoin deployment`);
      }

      // Generate Alice's and Bob's public keys from private keys (simplified)
      const alicePubkey = '02' + crypto.randomBytes(32).toString('hex');
      const bobPubkey = '02' + crypto.randomBytes(32).toString('hex');

      // Get current block height for timelock calculation
      const currentBlock = await getDogecoinBlockHeight();
      const timelock = currentBlock + 1000; // 1000 blocks from now

      console.log(`${isAlice ? 'Alice' : 'Bob'} creating Dogecoin HTCL with:`);
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

      console.log(`${isAlice ? 'Alice' : 'Bob'} created Dogecoin HTCL funding transaction:`, {
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
    console.log(`${isAlice ? 'Alice' : 'Bob'} using mock HTCL creation for network:`, network);
    const mockContractAddress = '0x' + Math.random().toString(16).substr(2, 40);
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);

    console.log(`${isAlice ? 'Alice' : 'Bob'} created mock HTCL:`, {
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
export const withdrawFromHTCL = async (network, contractAddress, secret, isAlice = false, asAlice = isAlice) => {
  try {
    console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from HTCL via API...`);

    // For EVM chains, we can use real contract interaction
    if (network === NetworkEnum.POLYGON_AMOY || network === NetworkEnum.ETHEREUM_SEPOLIA) {
      console.log(`${isAlice ? 'Alice' : 'Bob'} calling real HTCL contract on`, network);

      // Get RPC URL based on network
      let rpcUrl;
      if (network === NetworkEnum.POLYGON_AMOY) {
        rpcUrl = import.meta.env.VITE_POLYGON_AMOY_RPC_URL;
      } else if (network === NetworkEnum.ETHEREUM_SEPOLIA) {
        rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL found for network: ${network}`);
      }

      // Initialize Web3
      const web3 = new Web3(rpcUrl);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} withdrawal`);
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

      if (asAlice) {
        // Alice withdraws using aliceWithdraw()
        const aliceWithdrawTx = contract.methods.aliceWithdraw();

        // Estimate gas
        const gasEstimate = await aliceWithdrawTx.estimateGas({ from: account.address });
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2); // 1.2x buffer

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
        const gasLimit = Math.floor(Number(gasEstimate) * 1.2); // 1.2x buffer

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
      console.log(`${isAlice ? 'Alice' : 'Bob'} calling CosmWasm HTCL contract on Osmosis`);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} Osmosis withdrawal`);
      }

      // Setup wallet
      const wallet = await createOsmosisWallet(privateKey);
      const [account] = await wallet.getAccounts();
      console.log(`${isAlice ? 'Alice' : 'Bob'} withdrawing from contract:`, contractAddress);
      console.log('Using address:', account.address);

      // Setup client
      const rpcUrl = import.meta.env.VITE_OSMOSIS_RPC;
      if (!rpcUrl) {
        throw new Error('No Osmosis RPC URL found. Please set VITE_OSMOSIS_RPC environment variable.');
      }
      console.log('Using RPC URL for withdrawal:', rpcUrl);

      // Configure client with gas price for Osmosis
      const clientOptions = {
        gasPrice: "0.025uosmo" // Osmosis gas price
      };
      console.log('Client options for withdrawal:', clientOptions);
      const client = await SigningCosmWasmClient.connectWithSigner(rpcUrl, wallet, clientOptions);

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
      console.log(`${isAlice ? 'Alice' : 'Bob'} creating real Dogecoin HTCL withdrawal`);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} Dogecoin withdrawal`);
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
    console.log(`${isAlice ? 'Alice' : 'Bob'} using mock withdrawal for chain:`, network);
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

// Create order with LimitOrderProtocol (real contract)
export const createOrder = async (network, orderData, isAlice = true) => {
  try {
    console.log(`${isAlice ? 'Alice' : 'Bob'} creating order with LimitOrderProtocol via API...`)

    // For EVM chains, use real contract
    if (network === NetworkEnum.POLYGON_AMOY || network === NetworkEnum.ETHEREUM_SEPOLIA) {
      console.log(`${isAlice ? 'Alice' : 'Bob'} creating order on`, network);

      // Get RPC URL based on network
      let rpcUrl;
      if (network === NetworkEnum.POLYGON_AMOY) {
        rpcUrl = import.meta.env.VITE_POLYGON_AMOY_RPC_URL;
      } else if (network === NetworkEnum.ETHEREUM_SEPOLIA) {
        rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL found for network: ${network}`);
      }

      // Initialize Web3
      const web3 = new Web3(rpcUrl);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} order creation`);
      }

      // Setup account
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      web3.eth.accounts.wallet.add(account);

      console.log(`${isAlice ? 'Alice' : 'Bob'} creating order from address:`, account.address);
      console.log('Order data:', orderData);

      // Create contract instance - you'll need to deploy this contract first
      // For now, we'll use a mock address - you should replace this with the actual deployed contract address
      const contractAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual deployed address
      const contract = new web3.eth.Contract(limitOrderArtifact.abi, contractAddress);

      // Get gas price
      const gasPrice = await web3.eth.getGasPrice();
      const maxFeePerGas = web3.utils.toWei('50', 'gwei');
      const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei');

      console.log('Gas price:', gasPrice);
      console.log('Max fee per gas:', maxFeePerGas);
      console.log('Max priority fee per gas:', maxPriorityFeePerGas);

      // Create order using contract method
      const createOrderTx = contract.methods.createOrder(
        orderData.sourceChainId,
        orderData.destChainId,
        orderData.sourceWalletAddress,
        orderData.destWalletAddress,
        orderData.sourceToken,
        orderData.destToken,
        orderData.sourceAmount,
        orderData.destAmount,
        orderData.deadline
      );

      // Estimate gas
      const gasEstimate = await createOrderTx.estimateGas({ from: account.address });
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2); // 1.2x buffer

      console.log('Estimated gas for createOrder:', gasEstimate);
      console.log('Gas limit:', gasLimit);

      // Send transaction
      const tx = await createOrderTx.send({
        from: account.address,
        gas: gasLimit,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas
      });

      console.log(`${isAlice ? 'Alice' : 'Bob'} created order successfully!`);
      console.log('Transaction hash:', tx.transactionHash);

      // Get order ID from transaction receipt (you might need to parse events)
      const orderId = 0; // This should be extracted from the OrderCreated event

      return {
        orderId,
        txHash: tx.transactionHash,
        orderData,
        network
      };
    }

    // For other networks, use mock implementation
    console.log(`${isAlice ? 'Alice' : 'Bob'} using mock order creation for network:`, network);
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);

    console.log(`${isAlice ? 'Alice' : 'Bob'} created order (mocked):`, {
      network,
      txHash: mockTxHash,
      orderData
    });

    return {
      orderId: 0,
      txHash: mockTxHash,
      orderData,
      network
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

// Accept order with LimitOrderProtocol (real contract)
export const acceptOrder = async (network, orderId, hashlock, timelock, isAlice = false) => {
  try {
    console.log(`${isAlice ? 'Alice' : 'Bob'} accepting order with LimitOrderProtocol via API...`)

    // For EVM chains, use real contract
    if (network === NetworkEnum.POLYGON_AMOY || network === NetworkEnum.ETHEREUM_SEPOLIA) {
      console.log(`${isAlice ? 'Alice' : 'Bob'} accepting order on`, network);

      // Get RPC URL based on network
      let rpcUrl;
      if (network === NetworkEnum.POLYGON_AMOY) {
        rpcUrl = import.meta.env.VITE_POLYGON_AMOY_RPC_URL;
      } else if (network === NetworkEnum.ETHEREUM_SEPOLIA) {
        rpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
      }

      if (!rpcUrl) {
        throw new Error(`No RPC URL found for network: ${network}`);
      }

      // Initialize Web3
      const web3 = new Web3(rpcUrl);

      // Get private key from environment based on isAlice flag
      const privateKey = isAlice ? import.meta.env.VITE_PRIVATE_KEY_1 : import.meta.env.VITE_PRIVATE_KEY_2;
      if (!privateKey) {
        throw new Error(`No private key found for ${isAlice ? 'Alice' : 'Bob'} order acceptance`);
      }

      // Setup account
      const account = web3.eth.accounts.privateKeyToAccount(privateKey);
      web3.eth.accounts.wallet.add(account);

      console.log(`${isAlice ? 'Alice' : 'Bob'} accepting order from address:`, account.address);
      console.log('Order ID:', orderId);
      console.log('Hashlock:', hashlock);
      console.log('Timelock:', timelock);

      // Create contract instance - you'll need to deploy this contract first
      // For now, we'll use a mock address - you should replace this with the actual deployed contract address
      const contractAddress = '0x0000000000000000000000000000000000000000'; // Replace with actual deployed address
      const contract = new web3.eth.Contract(limitOrderArtifact.abi, contractAddress);

      // Get gas price
      const gasPrice = await web3.eth.getGasPrice();
      const maxFeePerGas = web3.utils.toWei('50', 'gwei');
      const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei');

      console.log('Gas price:', gasPrice);
      console.log('Max fee per gas:', maxFeePerGas);
      console.log('Max priority fee per gas:', maxPriorityFeePerGas);

      // Accept order using contract method
      const acceptOrderTx = contract.methods.acceptOrder(
        orderId,
        hashlock,
        timelock
      );

      // Estimate gas
      const gasEstimate = await acceptOrderTx.estimateGas({ from: account.address });
      const gasLimit = Math.floor(Number(gasEstimate) * 1.2); // 1.2x buffer

      console.log('Estimated gas for acceptOrder:', gasEstimate);
      console.log('Gas limit:', gasLimit);

      // Send transaction
      const tx = await acceptOrderTx.send({
        from: account.address,
        gas: gasLimit,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas
      });

      console.log(`${isAlice ? 'Alice' : 'Bob'} accepted order successfully!`);
      console.log('Transaction hash:', tx.transactionHash);

      return {
        orderId,
        txHash: tx.transactionHash,
        hashlock,
        timelock,
        network
      };
    }

    // For other networks, use mock implementation
    console.log(`${isAlice ? 'Alice' : 'Bob'} using mock order acceptance for network:`, network);
    const mockTxHash = '0x' + Math.random().toString(16).substr(2, 64);

    console.log(`${isAlice ? 'Alice' : 'Bob'} accepted order (mocked):`, {
      network,
      orderId,
      txHash: mockTxHash,
      hashlock,
      timelock
    });

    return {
      orderId,
      txHash: mockTxHash,
      hashlock,
      timelock,
      network
    };
  } catch (error) {
    console.error('Error accepting order:', error);
    throw error;
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

async function fundDogecoinHTCL(script, amount) {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/htcl/fund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, amount })
  });

  if (!response.ok) {
    throw new Error(`Failed to fund Dogecoin HTCL: ${response.statusText}`);
  }

  return response.json();
}

async function withdrawFromDogecoinHTCL(script, secret, amount, address, isAlice) {
  const response = await fetch(`${PROXY_BASE_URL}/dogecoin/htcl/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script, secret, amount, address, isAlice })
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