// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./UnrealToken.sol";

/**
 * @title UnrealBridge
 * @dev Bridge contract for $UNREAL utility token with 1inch Fusion+ integration
 * Implements hashlock/timelock mechanism for cross-chain atomic swaps
 */
contract UnrealBridge is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    
    UnrealToken public unrealToken;
    
    // Bridge intent structure for Fusion+ orders
    struct BridgeIntent {
        address user;           // User initiating the bridge
        uint256 amount;         // Amount to bridge
        uint256 sourceChainId;  // Source chain ID
        uint256 targetChainId;  // Target chain ID
        bytes32 hashlock;       // Hash of the secret
        uint256 timelock;       // Expiration timestamp
        bool completed;         // Whether intent is completed
        bool refunded;          // Whether intent is refunded
    }
    
    // Mapping from intent hash to bridge intent
    mapping(bytes32 => BridgeIntent) public bridgeIntents;
    
    // Events for Fusion+ integration
    event BridgeIntentCreated(
        bytes32 indexed intentHash,
        address indexed user,
        uint256 amount,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 hashlock,
        uint256 timelock
    );
    
    event BridgeIntentCompleted(
        bytes32 indexed intentHash,
        bytes32 secret
    );
    
    event BridgeIntentRefunded(
        bytes32 indexed intentHash
    );
    
    event FusionOrderCreated(
        bytes32 indexed intentHash,
        address indexed maker,
        bytes orderData
    );
    
    modifier validIntent(bytes32 intentHash) {
        require(bridgeIntents[intentHash].user != address(0), "Intent does not exist");
        require(!bridgeIntents[intentHash].completed, "Intent already completed");
        require(!bridgeIntents[intentHash].refunded, "Intent already refunded");
        _;
    }
    
    function initialize(address unrealToken_) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        unrealToken = UnrealToken(unrealToken_);
    }
    
    /**
     * @dev Create a bridge intent with hashlock/timelock
     * @param amount Amount to bridge
     * @param targetChainId Target chain ID
     * @param hashlock Hash of the secret (keccak256 of secret)
     * @param timelock Expiration timestamp
     */
    function createBridgeIntent(
        uint256 amount,
        uint256 targetChainId,
        bytes32 hashlock,
        uint256 timelock
    ) external nonReentrant returns (bytes32 intentHash) {
        require(amount > 0, "Amount must be greater than 0");
        require(timelock > block.timestamp, "Timelock must be in the future");
        require(hashlock != bytes32(0), "Invalid hashlock");
        
        // Generate unique intent hash
        intentHash = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            block.chainid,
            targetChainId,
            hashlock,
            timelock,
            block.timestamp
        ));
        
        // Store bridge intent
        bridgeIntents[intentHash] = BridgeIntent({
            user: msg.sender,
            amount: amount,
            sourceChainId: block.chainid,
            targetChainId: targetChainId,
            hashlock: hashlock,
            timelock: timelock,
            completed: false,
            refunded: false
        });
        
        // Lock $UNREAL tokens in bridge by transferring to bridge contract
        require(unrealToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        emit BridgeIntentCreated(
            intentHash,
            msg.sender,
            amount,
            block.chainid,
            targetChainId,
            hashlock,
            timelock
        );
        
        // Emit Fusion+ order creation event
        bytes memory orderData = abi.encode(intentHash, amount, targetChainId);
        emit FusionOrderCreated(intentHash, msg.sender, orderData);
        
        return intentHash;
    }
    
    /**
     * @dev Complete bridge intent by revealing secret
     * @param intentHash Hash of the bridge intent
     * @param secret Secret that matches the hashlock
     */
    function completeBridgeIntent(
        bytes32 intentHash,
        bytes32 secret
    ) external validIntent(intentHash) nonReentrant {
        BridgeIntent storage intent = bridgeIntents[intentHash];
        
        // Verify secret matches hashlock
        require(keccak256(abi.encodePacked(secret)) == intent.hashlock, "Invalid secret");
        require(block.timestamp <= intent.timelock, "Intent expired");
        
        // Mark as completed
        intent.completed = true;
        
        // Release locked $UNREAL tokens to user
        require(unrealToken.transfer(intent.user, intent.amount), "Transfer failed");
        
        emit BridgeIntentCompleted(intentHash, secret);
    }
    
    /**
     * @dev Refund bridge intent after timelock expires
     * @param intentHash Hash of the bridge intent
     */
    function refundBridgeIntent(
        bytes32 intentHash
    ) external validIntent(intentHash) nonReentrant {
        BridgeIntent storage intent = bridgeIntents[intentHash];
        
        require(block.timestamp > intent.timelock, "Intent not expired");
        require(msg.sender == intent.user, "Only user can refund");
        
        // Mark as refunded
        intent.refunded = true;
        
        // Refund $UNREAL tokens back to user
        require(unrealToken.transfer(intent.user, intent.amount), "Transfer failed");
        
        emit BridgeIntentRefunded(intentHash);
    }
    
    /**
     * @dev Get bridge intent details
     * @param intentHash Hash of the bridge intent
     */
    function getBridgeIntent(bytes32 intentHash) external view returns (BridgeIntent memory) {
        return bridgeIntents[intentHash];
    }
    
    /**
     * @dev Emergency function to update UNREAL token address
     * @param newUnrealToken New UNREAL token address
     */
    function setUnrealToken(address newUnrealToken) external onlyOwner {
        unrealToken = UnrealToken(newUnrealToken);
    }
}
