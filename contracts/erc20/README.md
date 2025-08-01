# ERC20 Token Deployment Guide

This guide shows how to deploy and mint the ERC20 token using Foundry.

## Prerequisites

1. **Install Foundry**:
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Install Dependencies**:
   ```bash
   forge install OpenZeppelin/openzeppelin-contracts
   forge install foundry-rs/forge-std
   ```

3. **Set up Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   PRIVATE_KEY=your_private_key_here
   RECIPIENT_ADDRESS=0x... # Address to mint tokens to
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
   POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
   ETHERSCAN_API_KEY=your_etherscan_api_key
   POLYGONSCAN_API_KEY=your_polygonscan_api_key
   ```

## Deployment Commands

### 1. Compile the Contract
```bash
forge build
```

### 2. Deploy to Local Network (for testing)
```bash
forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### 3. Deploy to Sepolia Testnet
```bash
forge script Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

### 4. Deploy to Polygon Amoy Testnet
```bash
forge script Deploy.s.sol --rpc-url $POLYGON_AMOY_RPC_URL --broadcast --verify
```

### 5. Deploy to Ethereum Mainnet
```bash
forge script Deploy.s.sol --rpc-url $ETHEREUM_RPC_URL --broadcast --verify
```

### 6. Deploy to Polygon Mainnet
```bash
forge script Deploy.s.sol --rpc-url $POLYGON_RPC_URL --broadcast --verify
```

## Contract Features

### Constructor Parameters
- `name`: Token name (e.g., "USDC")
- `symbol`: Token symbol (e.g., "USDC")
- `decimals`: Token decimals (18)
- `initialSupply`: Initial supply in whole tokens
- `initialOwner`: Owner address with minting rights

### Functions
- `mint(address to, uint256 amount)`: Mint tokens (owner only)
- `mintWithDecimals(address to, uint256 amount)`: Mint tokens with decimal conversion
- `burn(uint256 amount)`: Burn tokens from sender
- `burnFrom(address account, uint256 amount)`: Burn tokens from account (owner only)

## Example Usage

### Deploy with Custom Parameters
```bash
# Set custom parameters in Deploy.s.sol before running
forge script Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
```

### Mint Additional Tokens
```bash
# After deployment, use cast to mint more tokens
cast send <CONTRACT_ADDRESS> "mintWithDecimals(address,uint256)" <RECIPIENT_ADDRESS> <AMOUNT> --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

### Check Token Balance
```bash
cast call <CONTRACT_ADDRESS> "balanceOf(address)" <ADDRESS> --rpc-url $SEPOLIA_RPC_URL
```

## Verification

After deployment, verify the contract on block explorers:

### Sepolia
```bash
forge verify-contract <CONTRACT_ADDRESS> src/contracts/erc20/ERC20.sol:ERC20 --chain-id 11155111 --etherscan-api-key $ETHERSCAN_API_KEY
```

### Polygon Amoy
```bash
forge verify-contract <CONTRACT_ADDRESS> src/contracts/erc20/ERC20.sol:ERC20 --chain-id 80002 --etherscan-api-key $POLYGONSCAN_API_KEY
```

## Testing

Run tests to ensure the contract works correctly:
```bash
forge test
```

## Gas Optimization

The contract is optimized for gas efficiency:
- Uses OpenZeppelin's optimized ERC20 implementation
- Minimal storage variables
- Efficient minting and burning functions 