# HTCL Cross-Chain Order Implementation

This module implements Hash Time-Locked Contract (HTCL) functionality for cross-chain swaps between EVM, Cosmos, and Dogecoin chains.

## Overview

The implementation follows a specific flow where Alice (order creator) and Bob (order acceptor) coordinate to execute cross-chain swaps using HTCL contracts:

1. **Alice creates an order** with LimitOrderProtocol
2. **Bob accepts the order** waits for Alice deposit
3. **Alice creates HTCL deposit** on source chain with hashlock
4. **Bob creates HTCL deposit** on destination chain with hashlock
5. **Alice withdraws** from destination chain with secret before timelock
6. **Bob withdraws** from source chain with Alice's secret before timelock

## Supported Chain Combinations

- **EVM ↔ Cosmos**: Polygon ↔ Osmosis
- **EVM ↔ Dogecoin**: Polygon ↔ Dogecoin
- **Cosmos ↔ EVM**: Osmosis ↔ Polygon
- **Dogecoin ↔ EVM**: Dogecoin ↔ Polygon

## Environment Variables

```bash
# Alice's private key (order creator)
VITE_PRIVATE_KEY_1=0x...

# Bob's private key (order acceptor)
VITE_PRIVATE_KEY_2=0x...

# RPC endpoints
VITE_POLYGON_RPC=https://polygon-rpc.com
VITE_OSMOSIS_RPC=https://rpc.osmosis.zone
VITE_DOGECOIN_RPC=https://doge.getblock.io/mainnet/
```

## Contract Addresses

```javascript
const CONTRACT_ADDRESSES = {
    HTCL: '0x...', // Deployed HTCL contract address
    LIMIT_ORDER_PROTOCOL: '0x...', // Deployed LimitOrderProtocol address
    COSMOS_CODE_ID: 12792 // Osmosis HTCL contract code ID
};
```

## Main Functions

### `executeCrossChainSwapWithHTCL(srcChainId, dstChainId, amount, srcTokenAddress, dstTokenAddress, aliceAddress, bobAddress)`

Main function to execute a complete cross-chain swap with HTCL logic.

**Parameters:**
- `srcChainId`: Source chain ID (NetworkEnum)
- `dstChainId`: Destination chain ID (NetworkEnum)
- `amount`: Amount to swap (in smallest unit)
- `srcTokenAddress`: Source token address
- `dstTokenAddress`: Destination token address
- `aliceAddress`: Alice's wallet address
- `bobAddress`: Bob's wallet address

**Returns:**
```javascript
{
    orderId: number,
    secret: string,
    hashlock: string,
    timelock: number,
    orderCreation: Object,
    orderAcceptance: Object,
    aliceSourceHTCL: Object,
    bobDestHTCL: Object,
    aliceWithdrawal: Object,
    bobWithdrawal: Object,
    status: 'completed',
    timestamp: number
}
```

### Chain-Specific Functions

- `executeEVMToCosmosSwap()` - EVM to Cosmos swap
- `executeCosmosToEVMSwap()` - Cosmos to EVM swap
- `executeEVMToDogecoinSwap()` - EVM to Dogecoin swap
- `executeDogecoinToEVMSwap()` - Dogecoin to EVM swap

## HTCL Contract Functions

### EVM HTCL Contract

```solidity
// Create HTCL contract
constructor(address _bob, uint256 _timelock, bytes32 _hashlock) payable

// Alice withdraws after timelock
function aliceWithdraw() external

// Bob withdraws with secret before timelock
function bobWithdraw(bytes32 secret) external
```

### Cosmos HTCL Contract

The Cosmos HTCL contract is deployed with code ID `12789` on Osmosis and supports:

- Native token deposits
- CW20 token deposits
- Alice withdrawal after timelock
- Bob withdrawal with secret before timelock

### Dogecoin HTCL Contract

The Dogecoin HTCL implementation uses Bitcoin-style scripts with:

- P2SH addresses for HTCL contracts
- SHA256 + RIPEMD160 hashing
- Timelock-based withdrawal conditions

## Usage Examples

### Basic Cross-Chain Swap

```javascript
import { executeCrossChainSwapWithHTCL } from './crossChainOrder.js';
import { NetworkEnum } from '@1inch/fusion-sdk';

const result = await executeCrossChainSwapWithHTCL(
    NetworkEnum.OSMOSIS,        // Source chain
    NetworkEnum.POLYGON_AMOY,   // Destination chain
    '1000000',                  // Amount (1 USDC)
    TOKENS.OSMOSIS.USDC,        // Source token
    TOKENS.POLYGON_AMOY.USDC,   // Destination token
    '0xAlice...',               // Alice's address
    '0xBob...'                  // Bob's address
);
```

### Chain-Specific Swap

```javascript
import { executeEVMToCosmosSwap } from './crossChainOrder.js';

const result = await executeEVMToCosmosSwap(
    '1000000',
    TOKENS.POLYGON_AMOY.USDC,
    TOKENS.OSMOSIS.USDC,
    '0xAlice...',
    '0xBob...'
);
```

## Testing

Run the test suite to verify all functionality:

```javascript
import { runAllTests } from './crossChainOrder.test.js';

const results = await runAllTests();
console.log('Test results:', results);
```

## Security Considerations

1. **Private Keys**: Never expose private keys in client-side code
2. **Timelock**: Ensure timelock is reasonable (1 hour recommended)
3. **Secret Management**: Secrets should be generated securely
4. **Contract Verification**: Always verify deployed contract addresses
5. **Gas Estimation**: Include buffer for gas estimation (20% recommended)

## Error Handling

The implementation includes comprehensive error handling for:

- Invalid chain combinations
- Contract deployment failures
- Transaction failures
- Timelock violations
- Invalid secrets

## Legacy Support

The module maintains backward compatibility with legacy functions:

- `createCrossChainOrder()` (deprecated)
- `executeCrossChainSwap()` (deprecated)
- `submitOrder()` (deprecated)
- `monitorAndSubmitSecrets()` (deprecated)

These functions show deprecation warnings and redirect to the new HTCL implementation.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Alice (User)  │    │  Bob (Acceptor) │    │   Smart Chain   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Create Order      │                       │
         │─────────────────────▶│                       │
         │                       │                       │
         │                       │ 2. Accept Order      │
         │◀──────────────────────│                       │
         │                       │                       │
         │ 3. Create HTCL       │                       │
         │    (Source Chain)    │                       │
         │─────────────────────▶│                       │
         │                       │                       │
         │                       │ 4. Create HTCL       │
         │                       │    (Dest Chain)      │
         │                       │─────────────────────▶│
         │                       │                       │
         │ 5. Withdraw (Dest)   │                       │
         │    with Secret       │                       │
         │─────────────────────▶│                       │
         │                       │                       │
         │                       │ 6. Withdraw (Source) │
         │                       │    with Secret       │
         │                       │─────────────────────▶│
         │                       │                       │
```

## Dependencies

- `web3`: Ethereum Web3 library
- `@cosmjs/crypto`: Cosmos cryptographic functions
- `@1inch/fusion-sdk`: 1inch Fusion SDK for network enums
- `crypto`: Node.js crypto module for random generation 