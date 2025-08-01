#!/bin/bash

# SimpleERC20 Token Deployment Script
# Usage: ./deploy-token.sh [network] [recipient_address]

set -e

# Default values
NETWORK=${1:-"sepolia"}
RECIPIENT_ADDRESS=${2:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== SimpleERC20 Token Deployment ===${NC}"
echo "Network: $NETWORK"
echo "Recipient Address: $RECIPIENT_ADDRESS"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file with the following variables:"
    echo "PRIVATE_KEY=your_private_key_here"
    echo "RECIPIENT_ADDRESS=0x..."
    echo "SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR-PROJECT-ID"
    echo "POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology"
    echo "ETHERSCAN_API_KEY=your_etherscan_api_key"
    echo "POLYGONSCAN_API_KEY=your_polygonscan_api_key"
    exit 1
fi

# Load environment variables
source .env

# Set RPC URL based on network
case $NETWORK in
    "sepolia")
        RPC_URL=$SEPOLIA_RPC_URL
        CHAIN_ID=11155111
        EXPLORER_API_KEY=$ETHERSCAN_API_KEY
        ;;
    "polygon-amoy")
        RPC_URL=$POLYGON_AMOY_RPC_URL
        CHAIN_ID=80002
        EXPLORER_API_KEY=$POLYGONSCAN_API_KEY
        ;;
    "ethereum")
        RPC_URL=$ETHEREUM_RPC_URL
        CHAIN_ID=1
        EXPLORER_API_KEY=$ETHERSCAN_API_KEY
        ;;
    "polygon")
        RPC_URL=$POLYGON_RPC_URL
        CHAIN_ID=137
        EXPLORER_API_KEY=$POLYGONSCAN_API_KEY
        ;;
    *)
        echo -e "${RED}Error: Unknown network '$NETWORK'${NC}"
        echo "Supported networks: sepolia, polygon-amoy, ethereum, polygon"
        exit 1
        ;;
esac

# Check if required environment variables are set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env file${NC}"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo -e "${RED}Error: RPC URL not set for network '$NETWORK'${NC}"
    exit 1
fi

# Set recipient address if provided
if [ ! -z "$RECIPIENT_ADDRESS" ]; then
    export RECIPIENT_ADDRESS=$RECIPIENT_ADDRESS
fi

echo -e "${YELLOW}Compiling contracts...${NC}"
forge build

echo -e "${YELLOW}Deploying to $NETWORK...${NC}"
forge script src/contracts/erc20/Deploy.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $EXPLORER_API_KEY

echo -e "${GREEN}Deployment completed!${NC}"
echo "Check the output above for the contract address."

# Optional: Save deployment info to file
DEPLOYMENT_FILE="deployment-$NETWORK-$(date +%Y%m%d-%H%M%S).json"
echo "Saving deployment info to $DEPLOYMENT_FILE..."

cat > $DEPLOYMENT_FILE << EOF
{
    "network": "$NETWORK",
    "chainId": $CHAIN_ID,
    "deploymentTime": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "contractName": "SimpleERC20",
    "tokenName": "Only Tokens",
    "tokenSymbol": "ONLY",
    "tokenDecimals": 18,
    "initialSupply": 1000000,
    "recipientAddress": "$RECIPIENT_ADDRESS"
}
EOF

echo -e "${GREEN}Deployment info saved to $DEPLOYMENT_FILE${NC}" 