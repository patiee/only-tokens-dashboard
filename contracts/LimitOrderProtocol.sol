// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LimitOrderProtocol - Cross-Chain HTCL Order Management
 * @dev A smart contract that manages cross-chain HTCL orders
 * - Alice creates orders for cross-chain swaps
 * - Bob accepts orders and waits for Alice deposit
 * - Supports EVM, Cosmos, and Dogecoin chains
 */
contract LimitOrderProtocol {
    // Events
    event OrderCreated(
        uint256 indexed orderId,
        address indexed creator,
        string orderData
    );
    
    event OrderAccepted(
        uint256 indexed orderId,
        address indexed acceptor,
        bytes32 hashlock,
        uint256 timelock
    );
    
    event OrderCancelled(
        uint256 indexed orderId,
        address indexed creator
    );
    
    // Structs
    struct Order {
        string sourceChainId;
        string destChainId;
        string sourceWalletAddress;
        string destWalletAddress;
        string sourceToken;
        string destToken;
        uint256 sourceAmount;
        uint256 destAmount;
        uint256 deadline;
        address creator;
        bool isActive;
        bool isAccepted;
        address acceptor;
        bytes32 hashlock;
        uint256 timelock;
    }
    
    // State variables
    uint256 public nextOrderId;
    mapping(uint256 => Order) public orders;
    
    // Modifiers
    modifier onlyOrderCreator(uint256 orderId) {
        require(orders[orderId].creator == msg.sender, "LOP: Only order creator can call this");
        _;
    }
    
    modifier orderExists(uint256 orderId) {
        require(orders[orderId].creator != address(0), "LOP: Order does not exist");
        _;
    }
    
    modifier orderActive(uint256 orderId) {
        require(orders[orderId].isActive, "LOP: Order is not active");
        _;
    }
    
    modifier orderNotExpired(uint256 orderId) {
        require(block.timestamp <= orders[orderId].deadline, "LOP: Order has expired");
        _;
    }
    
    /**
     * @dev Create a new cross-chain limit order
     * @param sourceChainId Chain ID for source (evm, cosmos, dogecoin)
     * @param destChainId Chain ID for destination (evm, cosmos, dogecoin)
     * @param sourceWalletAddress Wallet address on source chain
     * @param destWalletAddress Wallet address on destination chain
     * @param sourceToken Token address on source chain (empty for Dogecoin)
     * @param destToken Token address on destination chain (empty for Dogecoin)
     * @param sourceAmount Amount on source chain
     * @param destAmount Amount on destination chain
     * @param deadline Timestamp when order expires
     */
    function createOrder(
        string memory sourceChainId,
        string memory destChainId,
        string memory sourceWalletAddress,
        string memory destWalletAddress,
        string memory sourceToken,
        string memory destToken,
        uint256 sourceAmount,
        uint256 destAmount,
        uint256 deadline
    ) external {
        require(bytes(sourceChainId).length > 0, "LOP: Source chain ID cannot be empty");
        require(bytes(destChainId).length > 0, "LOP: Dest chain ID cannot be empty");
        require(bytes(sourceWalletAddress).length > 0, "LOP: Source wallet address cannot be empty");
        require(bytes(destWalletAddress).length > 0, "LOP: Dest wallet address cannot be empty");
        require(sourceAmount > 0, "LOP: Source amount must be greater than 0");
        require(destAmount > 0, "LOP: Dest amount must be greater than 0");
        require(deadline > block.timestamp, "LOP: Deadline must be in the future");
        
        uint256 orderId = nextOrderId++;
        
        // Store order data
        orders[orderId] = Order({
            sourceChainId: sourceChainId,
            destChainId: destChainId,
            sourceWalletAddress: sourceWalletAddress,
            destWalletAddress: destWalletAddress,
            sourceToken: sourceToken,
            destToken: destToken,
            sourceAmount: sourceAmount,
            destAmount: destAmount,
            deadline: deadline,
            creator: msg.sender,
            isActive: true,
            isAccepted: false,
            acceptor: address(0),
            hashlock: bytes32(0),
            timelock: 0
        });
        
        // Emit event with JSON data
        emit OrderCreated(orderId, msg.sender, _createOrderJSON(
            sourceChainId, destChainId, sourceWalletAddress, destWalletAddress,
            sourceToken, destToken, sourceAmount, destAmount, deadline
        ));
    }
    
    /**
     * @dev Accept an order and provide hashlock for HTCL coordination
     * @param orderId ID of the order to accept
     * @param hashlock Universal hashlock for cross-chain HTCL
     * @param timelock Timelock for HTCL transactions
     */
    function acceptOrder(
        uint256 orderId,
        bytes32 hashlock,
        uint256 timelock
    ) external orderExists(orderId) orderActive(orderId) orderNotExpired(orderId) {
        Order storage order = orders[orderId];
        require(!order.isAccepted, "LOP: Order already accepted");
        require(hashlock != bytes32(0), "LOP: Hashlock cannot be zero");
        require(timelock > block.timestamp, "LOP: Timelock must be in the future");
        
        order.isAccepted = true;
        order.acceptor = msg.sender;
        order.hashlock = hashlock;
        order.timelock = timelock;
        
        emit OrderAccepted(orderId, msg.sender, hashlock, timelock);
    }
    
    /**
     * @dev Cancel an order (only by creator)
     * @param orderId ID of the order to cancel
     */
    function cancelOrder(uint256 orderId) external onlyOrderCreator(orderId) orderActive(orderId) {
        Order storage order = orders[orderId];
        require(!order.isAccepted, "LOP: Cannot cancel accepted order");
        
        order.isActive = false;
        
        emit OrderCancelled(orderId, msg.sender);
    }
    
    /**
     * @dev Get order information
     * @param orderId ID of the order
     * @return Order information
     */
    function getOrder(uint256 orderId) external view returns (Order memory) {
        return orders[orderId];
    }
    
    /**
     * @dev Check if order is ready for acceptance
     * @param orderId ID of the order
     * @return True if order is ready for acceptance
     */
    function isReadyForAcceptance(uint256 orderId) external view returns (bool) {
        Order memory order = orders[orderId];
        return order.isActive && !order.isAccepted && block.timestamp <= order.deadline;
    }
    
    /**
     * @dev Check if order is ready for HTCL creation
     * @param orderId ID of the order
     * @return True if ready for HTCL creation
     */
    function isReadyForHTCL(uint256 orderId) external view returns (bool) {
        Order memory order = orders[orderId];
        return order.isAccepted && order.isActive;
    }
    
    /**
     * @dev Get all active orders
     * @return Array of active order IDs
     */
    function getActiveOrders() external view returns (uint256[] memory) {
        uint256[] memory activeOrders = new uint256[](nextOrderId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextOrderId; i++) {
            if (orders[i].isActive) {
                activeOrders[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = activeOrders[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get orders by creator
     * @param creator Address of the order creator
     * @return Array of order IDs created by the address
     */
    function getOrdersByCreator(address creator) external view returns (uint256[] memory) {
        uint256[] memory creatorOrders = new uint256[](nextOrderId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextOrderId; i++) {
            if (orders[i].creator == creator) {
                creatorOrders[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = creatorOrders[i];
        }
        
        return result;
    }
    
    /**
     * @dev Get orders by acceptor
     * @param acceptor Address of the order acceptor
     * @return Array of order IDs accepted by the address
     */
    function getOrdersByAcceptor(address acceptor) external view returns (uint256[] memory) {
        uint256[] memory acceptorOrders = new uint256[](nextOrderId);
        uint256 count = 0;
        
        for (uint256 i = 0; i < nextOrderId; i++) {
            if (orders[i].acceptor == acceptor) {
                acceptorOrders[count] = i;
                count++;
            }
        }
        
        // Resize array to actual count
        uint256[] memory result = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = acceptorOrders[i];
        }
        
        return result;
    }
    
    /**
     * @dev Create JSON string for order data
     * @param sourceChainId Source chain ID
     * @param destChainId Destination chain ID
     * @param sourceWalletAddress Source wallet address
     * @param destWalletAddress Destination wallet address
     * @param sourceToken Source token address
     * @param destToken Destination token address
     * @param sourceAmount Source amount
     * @param destAmount Destination amount
     * @param deadline Order deadline
     * @return JSON string
     */
    function _createOrderJSON(
        string memory sourceChainId,
        string memory destChainId,
        string memory sourceWalletAddress,
        string memory destWalletAddress,
        string memory sourceToken,
        string memory destToken,
        uint256 sourceAmount,
        uint256 destAmount,
        uint256 deadline
    ) internal pure returns (string memory) {
        return string(abi.encodePacked(
            '{"sourceChainId":"', sourceChainId, '",',
            '"destChainId":"', destChainId, '",',
            '"sourceWalletAddress":"', sourceWalletAddress, '",',
            '"destWalletAddress":"', destWalletAddress, '",',
            '"sourceToken":"', sourceToken, '",',
            '"destToken":"', destToken, '",',
            '"sourceAmount":"', uint256ToString(sourceAmount), '",',
            '"destAmount":"', uint256ToString(destAmount), '",',
            '"deadline":"', uint256ToString(deadline), '"}'
        ));
    }
    
    /**
     * @dev Convert uint256 to string
     * @param value The uint256 value to convert
     * @return The string representation
     */
    function uint256ToString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        
        return string(buffer);
    }
} 