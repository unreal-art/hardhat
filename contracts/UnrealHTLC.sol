// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "./UnrealToken.sol";

/**
 * @title UnrealHTLC (Hash Time Lock Contract)
 * @dev This contract implements the HTLC functionality for cross-chain swaps between
 * Etherlink and NEAR using the 1inch Fusion+ pattern.
 */
contract UnrealHTLC is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    // Lock contract structure for HTLC
    struct LockContract {
        bytes32 secretHash;     // Hash of the secret (preimage)
        address payable recipient; // Recipient address
        address payable sender;    // Sender address
        uint256 amount;         // Amount of tokens locked
        uint256 endtime;        // Expiration timestamp
        bool withdrawn;         // Whether the funds have been withdrawn
        bool refunded;          // Whether the funds have been refunded
        string preimage;        // The revealed secret (empty until revealed)
    }

    // Token contract
    UnrealToken public unrealToken;

    // Mapping from lock contract ID to lock contract details
    mapping(bytes32 => LockContract) public lockContracts;

    // Events
    event SwapInitiated(
        bytes32 indexed lockContractId,
        bytes32 secretHash,
        address indexed recipient,
        address indexed sender,
        uint256 amount,
        uint256 endtime,
        string targetChain,
        string targetAddress
    );
    
    event SwapWithdrawn(
        bytes32 indexed lockContractId,
        string preimage
    );
    
    event SwapRefunded(
        bytes32 indexed lockContractId
    );

    event CrossChainSwapCompleted(
        bytes32 lockContractId,
        string sourceChain,
        string sourceAddress,
        address destinationAddress,
        uint256 amount,
        string preimage
    );

    // Modifiers
    modifier futureEndtime(uint256 endtime) {
        require(endtime > block.timestamp, "End time must be in the future");
        _;
    }

    modifier lockContractExists(bytes32 lockContractId) {
        require(hasLockContract(lockContractId), "Lock contract does not exist");
        _;
    }

    modifier matchesSecretHash(bytes32 lockContractId, string memory preimage) {
        require(
            lockContracts[lockContractId].secretHash == sha256(abi.encodePacked(preimage)),
            "Secret hash does not match"
        );
        _;
    }

    modifier withdrawable(bytes32 lockContractId) {
        require(lockContracts[lockContractId].recipient == msg.sender, "Not the recipient");
        require(!lockContracts[lockContractId].withdrawn, "Already withdrawn");
        require(!lockContracts[lockContractId].refunded, "Already refunded");
        _;
    }

    modifier refundable(bytes32 lockContractId) {
        require(lockContracts[lockContractId].sender == msg.sender, "Not the sender");
        require(!lockContracts[lockContractId].withdrawn, "Already withdrawn");
        require(!lockContracts[lockContractId].refunded, "Already refunded");
        require(lockContracts[lockContractId].endtime <= block.timestamp, "Timelock not expired");
        _;
    }

    /**
     * @dev Initialize the contract
     * @param _unrealToken Address of the UnrealToken contract
     */
    function initialize(UnrealToken _unrealToken) public initializer {
        __Ownable_init();
        __ReentrancyGuard_init();
        
        unrealToken = _unrealToken;
    }

    /**
     * @dev Initiates a cross-chain swap by locking tokens in the contract
     * @param secretHash Hash of the secret (sha256)
     * @param recipient Address that can withdraw the tokens with the secret
     * @param amount Amount of tokens to lock
     * @param endtime Timestamp after which the sender can reclaim the tokens
     * @param targetChain Target blockchain name (e.g. "NEAR")
     * @param targetAddress Target address on the other chain
     * @return lockContractId ID of the created lock contract
     */
    function initiateSwap(
        bytes32 secretHash,
        address payable recipient,
        uint256 amount,
        uint256 endtime,
        string calldata targetChain,
        string calldata targetAddress
    ) external nonReentrant futureEndtime(endtime) returns (bytes32 lockContractId) {
        require(amount > 0, "Amount must be greater than 0");
        
        // Generate a unique lock contract ID
        lockContractId = sha256(
            abi.encodePacked(
                secretHash,
                recipient,
                msg.sender,
                amount,
                endtime,
                block.timestamp
            )
        );
        
        // Make sure it doesn't already exist
        require(!hasLockContract(lockContractId), "Lock contract already exists");
        
        // Transfer tokens from the sender to this contract
        require(
            unrealToken.transferFrom(msg.sender, address(this), amount),
            "Token transfer failed"
        );
        
        // Store the lock contract details
        lockContracts[lockContractId] = LockContract({
            secretHash: secretHash,
            recipient: recipient,
            sender: payable(msg.sender),
            amount: amount,
            endtime: endtime,
            withdrawn: false,
            refunded: false,
            preimage: ""
        });
        
        // Emit event
        emit SwapInitiated(
            lockContractId,
            secretHash,
            recipient,
            msg.sender,
            amount,
            endtime,
            targetChain,
            targetAddress
        );
        
        return lockContractId;
    }

    /**
     * @dev Withdraw tokens by revealing the secret
     * @param lockContractId ID of the lock contract
     * @param preimage Secret that hashes to the secretHash
     * @return success True if successful
     */
    function withdraw(
        bytes32 lockContractId,
        string memory preimage
    )
        external
        nonReentrant
        lockContractExists(lockContractId)
        matchesSecretHash(lockContractId, preimage)
        withdrawable(lockContractId)
        returns (bool success)
    {
        // Get the lock contract
        LockContract storage lockContract = lockContracts[lockContractId];
        
        // Update the contract
        lockContract.preimage = preimage;
        lockContract.withdrawn = true;
        
        // Transfer tokens to the recipient
        require(
            unrealToken.transfer(lockContract.recipient, lockContract.amount),
            "Token transfer failed"
        );
        
        // Emit event
        emit SwapWithdrawn(lockContractId, preimage);
        
        return true;
    }

    /**
     * @dev Refund tokens to the sender if the timelock has expired
     * @param lockContractId ID of the lock contract
     * @return success True if successful
     */
    function refund(
        bytes32 lockContractId
    )
        external
        nonReentrant
        lockContractExists(lockContractId)
        refundable(lockContractId)
        returns (bool success)
    {
        // Get the lock contract
        LockContract storage lockContract = lockContracts[lockContractId];
        
        // Update the contract
        lockContract.refunded = true;
        
        // Transfer tokens back to the sender
        require(
            unrealToken.transfer(lockContract.sender, lockContract.amount),
            "Token transfer failed"
        );
        
        // Emit event
        emit SwapRefunded(lockContractId);
        
        return true;
    }

    /**
     * @dev Complete a cross-chain swap from another chain (to be called by relayer/oracle)
     * @param sourceChain Source blockchain name (e.g. "NEAR")
     * @param sourceAddress Source address on the other chain
     * @param destinationAddress Address to receive tokens on Etherlink
     * @param amount Amount of tokens to transfer
     * @param preimage Secret that was revealed on the source chain
     */
    function completeSwap(
        string calldata sourceChain,
        string calldata sourceAddress,
        address destinationAddress,
        uint256 amount,
        string calldata preimage
    ) external onlyOwner nonReentrant {
        // Generate a unique ID for this cross-chain completion
        bytes32 lockContractId = sha256(
            abi.encodePacked(
                sourceChain,
                sourceAddress,
                destinationAddress,
                amount,
                preimage
            )
        );
        
        // Mint or transfer tokens to the destination address
        // (Assuming we have minting rights, otherwise would need to be pre-funded)
        unrealToken.mint(destinationAddress, amount);
        
        // Emit event
        emit CrossChainSwapCompleted(
            lockContractId,
            sourceChain,
            sourceAddress,
            destinationAddress,
            amount,
            preimage
        );
    }

    /**
     * @dev Check if a lock contract exists
     * @param lockContractId ID of the lock contract
     * @return exists True if the contract exists
     */
    function hasLockContract(bytes32 lockContractId) public view returns (bool) {
        return lockContracts[lockContractId].sender != address(0);
    }

    /**
     * @dev Get details of a lock contract
     * @param lockContractId The ID of the lock contract to get
     * @return secretHash The hash of the secret
     * @return recipient The recipient address
     * @return sender The sender address
     * @return amount The token amount
     * @return endtime The expiry timestamp
     * @return withdrawn Whether the tokens were withdrawn
     * @return refunded Whether the tokens were refunded
     * @return preimage The revealed preimage (if withdrawn)
     */
    function getLockContract(bytes32 lockContractId)
        external
        view
        returns (
            bytes32 secretHash,
            address recipient,
            address sender,
            uint256 amount,
            uint256 endtime,
            bool withdrawn,
            bool refunded,
            string memory preimage
        )
    {
        require(hasLockContract(lockContractId), "Lock contract does not exist");
        
        LockContract storage lockContract = lockContracts[lockContractId];
        
        return (
            lockContract.secretHash,
            lockContract.recipient,
            lockContract.sender,
            lockContract.amount,
            lockContract.endtime,
            lockContract.withdrawn,
            lockContract.refunded,
            lockContract.preimage
        );
    }
}
