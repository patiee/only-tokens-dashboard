// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title HTCL - Hash Time-Locked Contract
 * @dev A smart contract that implements hash time-locked functionality
 * - Alice (creator) can withdraw only after timelock with hashlock
 * - Bob (another person) can withdraw only before timelock with hashlock
 * - Supports cross-chain compatibility with universal hashlock format
 */
contract HTCL {
    // State variables
    address public immutable alice;
    address public immutable bob;
    uint256 public immutable timelock;
    bytes32 public immutable hashlock;  // Universal hashlock that works across all chains
    uint256 public immutable amount;
    
    // Events
    event HTCLCreated(address indexed creator, address indexed recipient, uint256 amount, uint256 timelock, bytes32 hashlock);
    event AliceWithdrawn(address indexed alice, uint256 amount);
    event BobWithdrawn(address indexed bob, uint256 amount, bytes32 secret);
    event HTCLExpired(address indexed creator, uint256 amount);
    
    // Modifiers
    modifier onlyAlice() {
        require(msg.sender == alice, "HTCL: Only Alice can call this function");
        _;
    }
    
    modifier onlyBob() {
        require(msg.sender == bob, "HTCL: Only Bob can call this function");
        _;
    }
    
    modifier timelockExpired() {
        require(block.timestamp >= timelock, "HTCL: Timelock has not expired yet");
        _;
    }
    
    modifier timelockNotExpired() {
        require(block.timestamp < timelock, "HTCL: Timelock has already expired");
        _;
    }
    
    /**
     * @dev Constructor to create the HTCL
     * @param _bob The address of Bob (recipient)
     * @param _timelock The timestamp when the timelock expires
     * @param _hashlock The universal hashlock that works across all chains
     */
    constructor(
        address _bob,
        uint256 _timelock,
        bytes32 _hashlock
    ) payable {
        require(_bob != address(0), "HTCL: Bob address cannot be zero");
        require(_timelock > block.timestamp, "HTCL: Timelock must be in the future");
        require(_hashlock != bytes32(0), "HTCL: Hashlock cannot be zero");
        require(msg.value > 0, "HTCL: Contract must be funded");
        
        alice = msg.sender;
        bob = _bob;
        timelock = _timelock;
        hashlock = _hashlock;
        amount = msg.value;
        
        emit HTCLCreated(alice, bob, amount, timelock, hashlock);
    }
    
    /**
     * @dev Alice can withdraw funds after timelock expires
     * This function allows Alice to reclaim her funds if Bob doesn't withdraw
     */
    function aliceWithdraw() external onlyAlice timelockExpired {
        require(address(this).balance > 0, "HTCL: No funds to withdraw");
        
        uint256 balance = address(this).balance;
        (bool success, ) = payable(alice).call{value: balance}("");
        require(success, "HTCL: Transfer to Alice failed");
        
        emit AliceWithdrawn(alice, balance);
    }
    
    /**
     * @dev Bob can withdraw funds before timelock expires by providing the secret
     * @param secret The secret that hashes to the hashlock
     */
    function bobWithdraw(bytes32 secret) external onlyBob timelockNotExpired {
        require(address(this).balance > 0, "HTCL: No funds to withdraw");
        require(keccak256(abi.encodePacked(secret)) == hashlock, "HTCL: Invalid secret");
        
        uint256 balance = address(this).balance;
        (bool success, ) = payable(bob).call{value: balance}("");
        require(success, "HTCL: Transfer to Bob failed");
        
        emit BobWithdrawn(bob, balance, secret);
    }
    
    /**
     * @dev Get the current balance of the contract
     * @return The current balance
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Check if the timelock has expired
     * @return True if timelock has expired, false otherwise
     */
    function isTimelockExpired() external view returns (bool) {
        return block.timestamp >= timelock;
    }
    
    /**
     * @dev Check if the provided secret matches the hashlock
     * @param secret The secret to check
     * @return True if secret matches hashlock, false otherwise
     */
    function isValidSecret(bytes32 secret) external view returns (bool) {
        return keccak256(abi.encodePacked(secret)) == hashlock;
    }
    
    /**
     * @dev Get contract information
     * @return _alice Alice's address
     * @return _bob Bob's address
     * @return _timelock Timelock expiration timestamp
     * @return _hashlock The universal hashlock
     * @return _amount Original amount deposited
     * @return _balance Current contract balance
     */
    function getContractInfo() external view returns (
        address _alice,
        address _bob,
        uint256 _timelock,
        bytes32 _hashlock,
        uint256 _amount,
        uint256 _balance
    ) {
        return (alice, bob, timelock, hashlock, amount, address(this).balance);
    }
} 