const { ethers } = require('hardhat');

async function main() {
    console.log('Deploying ERC20 contract...');

    // Contract parameters
    const tokenName = "USDC";
    const tokenSymbol = "USDC";
    const tokenDecimals = 18;
    const initialSupply = 1000000; // 1 million tokens
    const mintAmount = 100000; // 100k tokens to mint

    // Get the contract factory
    const ERC20 = await ethers.getContractFactory('ERC20');

    // Get signer (deployer)
    const [deployer] = await ethers.getSigners();
    console.log('Deploying contracts with the account:', deployer.address);

    // Deploy the contract
    const token = await ERC20.deploy(
        tokenName,
        tokenSymbol,
        tokenDecimals,
        initialSupply,
        deployer.address
    );

    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();

    console.log('ERC20 deployed to:', tokenAddress);
    console.log('Token Name:', tokenName);
    console.log('Token Symbol:', tokenSymbol);
    console.log('Token Decimals:', tokenDecimals);
    console.log('Initial Supply:', initialSupply);

    // Mint additional tokens to a specific address
    const recipientAddress = "0x..."; // Replace with the wallet address you want to mint to
    if (recipientAddress !== "0x...") {
        console.log('Minting', mintAmount, 'tokens to:', recipientAddress);

        const mintTx = await token.mintWithDecimals(recipientAddress, mintAmount);
        await mintTx.wait();

        console.log('Minting transaction hash:', mintTx.hash);

        // Check the balance
        const balance = await token.balanceOf(recipientAddress);
        console.log('Recipient balance:', ethers.formatUnits(balance, tokenDecimals));
    }

    // Log deployment info
    console.log('\n=== Deployment Summary ===');
    console.log('Contract Address:', tokenAddress);
    console.log('Deployer Address:', deployer.address);
    console.log('Network:', (await ethers.provider.getNetwork()).name);
    console.log('Block Number:', await ethers.provider.getBlockNumber());

    return {
        tokenAddress,
        deployerAddress: deployer.address,
        tokenName,
        tokenSymbol,
        tokenDecimals,
        initialSupply
    };
}

// Execute deployment
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = { main }; 