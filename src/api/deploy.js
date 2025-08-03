import Web3 from 'web3';
import fs from 'fs';
import path from 'path';

// Environment variables - read once at the beginning
const ENV_VARS = {
    PRIVATE_KEY_1: process.env.VITE_PRIVATE_KEY_1,
    PRIVATE_KEY_2: process.env.VITE_PRIVATE_KEY_2,
    POLYGON_AMOY_RPC_URL: process.env.VITE_POLYGON_AMOY_RPC_URL,
    SEPOLIA_RPC_URL: process.env.VITE_SEPOLIA_RPC_URL
};

// Load contract artifacts
const htclArtifact = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'artifacts/contracts/HTCL.sol/HTCL.json'), 'utf8'));

// Initialize Web3 instances
const polygonWeb3 = new Web3(ENV_VARS.POLYGON_AMOY_RPC_URL);
const sepoliaWeb3 = new Web3(ENV_VARS.SEPOLIA_RPC_URL);

/**
 * Deploy HTCL contract to a network
 * @param {Web3} web3 - Web3 instance
 * @param {string} privateKey - Private key for deployment
 * @param {string} bobAddress - Bob's address
 * @param {number} timelock - Timelock expiration
 * @param {string} hashlock - Hashlock
 * @param {string} amount - Amount to deposit
 * @returns {Promise<Object>} Deployment result
 */
async function deployHTCLContract(web3, privateKey, bobAddress, timelock, hashlock, amount) {
    try {
        console.log('Deploying HTCL contract...');

        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        // Create contract instance
        const contract = new web3.eth.Contract(htclArtifact.abi);

        // Get gas price
        const gasPrice = await web3.eth.getGasPrice();
        const maxFeePerGas = web3.utils.toWei('50', 'gwei');
        const maxPriorityFeePerGas = web3.utils.toWei('30', 'gwei');

        // Deploy contract
        const deployTx = contract.deploy({
            data: htclArtifact.bytecode,
            arguments: [bobAddress, timelock, hashlock]
        });

        // Estimate gas
        const gasEstimate = await deployTx.estimateGas({ from: account.address, value: amount });
        const gasLimit = gasEstimate * 120 / 100; // 1.2x buffer

        // Send transaction
        const tx = await deployTx.send({
            from: account.address,
            gas: gasLimit,
            value: amount,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas
        });

        console.log('HTCL contract deployed:', {
            contractAddress: tx.contractAddress,
            txHash: tx.transactionHash,
            bobAddress,
            timelock,
            hashlock,
            amount
        });

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
 * Deploy contracts to all networks
 */
async function deployAllContracts() {
    try {
        console.log('Deploying HTCL contracts to all networks...');

        // Generate test parameters
        const bobAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        const timelock = Math.floor(Date.now() / 1000) + 3600; // 1 hour
        const hashlock = '0x' + Math.random().toString(16).substr(2, 64);
        const amount = web3.utils.toWei('0.1', 'ether');

        // Deploy to Polygon
        console.log('\n=== Deploying to Polygon ===');
        const polygonDeployment = await deployHTCLContract(polygonWeb3, ENV_VARS.PRIVATE_KEY_1, bobAddress, timelock, hashlock, amount);

        // Deploy to Sepolia
        console.log('\n=== Deploying to Sepolia ===');
        const sepoliaDeployment = await deployHTCLContract(sepoliaWeb3, ENV_VARS.PRIVATE_KEY_1, bobAddress, timelock, hashlock, amount);

        const deployments = {
            polygon: polygonDeployment,
            sepolia: sepoliaDeployment
        };

        // Save deployment addresses
        fs.writeFileSync('deployed-contracts.json', JSON.stringify(deployments, null, 2));

        console.log('\n=== All contracts deployed successfully ===');
        console.log('Deployment addresses saved to deployed-contracts.json');

        return deployments;
    } catch (error) {
        console.error('Error deploying contracts:', error);
        throw error;
    }
}

// Run deployment if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    deployAllContracts()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error('Deployment failed:', error);
            process.exit(1);
        });
}

export { deployHTCLContract, deployAllContracts }; 