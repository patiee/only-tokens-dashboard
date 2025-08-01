// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./ERC20.sol";

contract ERC20Test is Test {
    ERC20 public token;
    address public owner;
    address public user1;
    address public user2;

    function setUp() public {
        owner = makeAddr("owner");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.startPrank(owner);
        token = new ERC20(
            "USDC",
            "USDC",
            18,
            1000000, // 1 million tokens
            owner
        );
        vm.stopPrank();
    }

    function testInitialState() public {
        assertEq(token.name(), "USDC");
        assertEq(token.symbol(), "USDC");
        assertEq(token.decimals(), 18);
        assertEq(token.totalSupply(), 1000000 * 10**18);
        assertEq(token.balanceOf(owner), 1000000 * 10**18);
    }

    function testMint() public {
        uint256 mintAmount = 1000 * 10**18;
        
        vm.startPrank(owner);
        token.mint(user1, mintAmount);
        vm.stopPrank();

        assertEq(token.balanceOf(user1), mintAmount);
        assertEq(token.totalSupply(), 1000000 * 10**18 + mintAmount);
    }

    function testMintWithDecimals() public {
        uint256 mintAmount = 1000; // 1000 whole tokens
        
        vm.startPrank(owner);
        token.mintWithDecimals(user1, mintAmount);
        vm.stopPrank();

        assertEq(token.balanceOf(user1), mintAmount * 10**18);
        assertEq(token.totalSupply(), 1000000 * 10**18 + mintAmount * 10**18);
    }

    function testMintOnlyOwner() public {
        vm.startPrank(user1);
        vm.expectRevert();
        token.mint(user2, 1000 * 10**18);
        vm.stopPrank();
    }

    function testBurn() public {
        uint256 mintAmount = 1000 * 10**18;
        
        vm.startPrank(owner);
        token.mint(user1, mintAmount);
        vm.stopPrank();

        vm.startPrank(user1);
        token.burn(500 * 10**18);
        vm.stopPrank();

        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.totalSupply(), 1000000 * 10**18 + 500 * 10**18);
    }

    function testBurnFrom() public {
        uint256 mintAmount = 1000 * 10**18;
        
        vm.startPrank(owner);
        token.mint(user1, mintAmount);
        vm.stopPrank();

        vm.startPrank(owner);
        token.burnFrom(user1, 500 * 10**18);
        vm.stopPrank();

        assertEq(token.balanceOf(user1), 500 * 10**18);
        assertEq(token.totalSupply(), 1000000 * 10**18 + 500 * 10**18);
    }

    function testBurnFromOnlyOwner() public {
        vm.startPrank(user1);
        vm.expectRevert();
        token.burnFrom(user2, 1000 * 10**18);
        vm.stopPrank();
    }

    function testTransfer() public {
        uint256 transferAmount = 1000 * 10**18;
        
        vm.startPrank(owner);
        token.transfer(user1, transferAmount);
        vm.stopPrank();

        assertEq(token.balanceOf(owner), 1000000 * 10**18 - transferAmount);
        assertEq(token.balanceOf(user1), transferAmount);
    }

    function testApproveAndTransferFrom() public {
        uint256 approveAmount = 1000 * 10**18;
        
        vm.startPrank(owner);
        token.approve(user1, approveAmount);
        vm.stopPrank();

        vm.startPrank(user1);
        token.transferFrom(owner, user2, 500 * 10**18);
        vm.stopPrank();

        assertEq(token.balanceOf(user2), 500 * 10**18);
        assertEq(token.balanceOf(owner), 1000000 * 10**18 - 500 * 10**18);
        assertEq(token.allowance(owner, user1), 500 * 10**18);
    }
} 