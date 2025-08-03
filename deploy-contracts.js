import Web3 from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load contract artifacts
const htclArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, 'artifacts/contracts/HTCL.sol/HTCL.json'), 'utf8'));

// Environment variables
const PRIVATE_KEY_1 = process.env.VITE_PRIVATE_KEY_1;
const PRIVATE_KEY_2 = process.env.VITE_PRIVATE_KEY_2;
const polygonRpc = process.env.VITE_POLYGON_RPC;
const sepoliaRpc = process.env.VITE_SEPOLIA_RPC_URL;

console.log('HTCL Contract ABI loaded:', htclArtifact.abi.length, 'functions');
console.log('Contract bytecode length:', htclArtifact.bytecode.length);

// Initialize Web3 instances
const polygonWeb3 = new Web3(polygonRpc);
const sepoliaWeb3 = new Web3(sepoliaRpc);

/**
 * Deploy HTCL contract to a network
 */
async function deployHTCLContract(web3, privateKey, bobAddress, timelock, hashlock, amount) {
    try {
        console.log('Deploying HTCL contract...');
        
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
        const gasLimit = Math.floor(gasEstimate * 1.2); // 1.2x buffer
        
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
            amount
        };
    } catch (error) {
        console.error('Error deploying HTCL contract:', error);
        throw error;
    }
}

/**
 * Deploy contracts to test networks
 */
async function deployAllContracts() {
    try {
        console.log('=== Deploying HTCL contracts to test networks ===');
        
        // Generate test parameters
        const bobAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        const hashlock = '0x' + Math.random().toString(16).substr(2, 64);
        const amount = polygonWeb3.utils.toWei('0.01', 'ether'); // 0.01 ETH
        
        console.log('Test parameters:');
        console.log('- Bob address:', bobAddress);
        console.log('- Timelock:', timelock);
        console.log('- Hashlock:', hashlock);
        console.log('- Amount:', amount);
        
        const deployments = {};
        
        // Deploy to Polygon (if private key is available)
        if (PRIVATE_KEY_1 && polygonRpc) {
            console.log('\n=== Deploying to Polygon ===');
            try {
                deployments.polygon = await deployHTCLContract(
                    polygonWeb3, 
                    PRIVATE_KEY_1, 
                    bobAddress, 
                    timelock, 
                    hashlock, 
                    amount
                );
            } catch (error) {
                console.error('Failed to deploy to Polygon:', error.message);
            }
        } else {
            console.log('Skipping Polygon deployment - missing private key or RPC URL');
        }
        
        // Deploy to Sepolia (if private key is available)
        if (PRIVATE_KEY_1 && sepoliaRpc) {
            console.log('\n=== Deploying to Sepolia ===');
            try {
                deployments.sepolia = await deployHTCLContract(
                    sepoliaWeb3, 
                    PRIVATE_KEY_1, 
                    bobAddress, 
                    timelock, 
                    hashlock, 
                    amount
                );
            } catch (error) {
                console.error('Failed to deploy to Sepolia:', error.message);
            }
        } else {
            console.log('Skipping Sepolia deployment - missing private key or RPC URL');
        }
        
        // Save deployment addresses
        if (Object.keys(deployments).length > 0) {
            fs.writeFileSync('deployed-contracts.json', JSON.stringify(deployments, null, 2));
            console.log('\n=== Deployment addresses saved to deployed-contracts.json ===');
        } else {
            console.log('\n=== No contracts were deployed ===');
        }
        
        return deployments;
    } catch (error) {
        console.error('Error deploying contracts:', error);
        throw error;
    }
}

// Run deployment
deployAllContracts()
    .then(() => {
        console.log('\n=== Deployment completed ===');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Deployment failed:', error);
        process.exit(1);
    }); 