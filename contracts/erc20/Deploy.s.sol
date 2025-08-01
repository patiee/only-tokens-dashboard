// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "./ERC20.sol";

contract DeployERC20 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        // Contract parameters
        string memory tokenName = "USDC";
        string memory tokenSymbol = "USDC";
        uint8 tokenDecimals = 18;
        uint256 initialSupply = 1000000; // 1 million tokens
        uint256 mintAmount = 100000; // 100k tokens to mint
        
        // Get deployer address
        address deployer = vm.addr(deployerPrivateKey);
        address recipient = vm.envAddress("RECIPIENT_ADDRESS"); // Set this in .env
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the contract
        ERC20 token = new ERC20(
            tokenName,
            tokenSymbol,
            tokenDecimals,
            initialSupply,
            deployer
        );
        
        // Mint additional tokens to recipient
        if (recipient != address(0)) {
            token.mintWithDecimals(recipient, mintAmount);
        }
        
        vm.stopBroadcast();
        
        // Log deployment info
        console.log("=== ERC20 Deployment ===");
        console.log("Contract Address:", address(token));
        console.log("Deployer Address:", deployer);
        console.log("Token Name:", tokenName);
        console.log("Token Symbol:", tokenSymbol);
        console.log("Token Decimals:", tokenDecimals);
        console.log("Initial Supply:", initialSupply);
        
        if (recipient != address(0)) {
            console.log("Minted Amount:", mintAmount);
            console.log("Recipient Address:", recipient);
            console.log("Recipient Balance:", token.balanceOf(recipient));
        }
    }
} 