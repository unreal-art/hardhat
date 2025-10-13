// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OnePToken.sol";
import "./OnePProtocol.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/**
 * @title OneP
 * @dev Child contract that inherits from OnePToken and implements the 1P Protocol
 * @notice This contract adds quantum-resistant authentication functionality to the base token
 *
 * Architecture:
 * - Inherits from OnePToken for ERC20 functionality and token economics
 * - Uses OnePProtocol library for authentication logic
 * - Maintains separation of concerns: token logic in parent, protocol logic here
 */
contract OneP is OnePToken {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // Protocol State
    mapping(string => OnePProtocol.UserProfile) public usernameRegistry;
    mapping(string => OnePProtocol.UserState) public userStateRegistry;
    mapping(uint64 => OnePProtocol.Attempt) public attemptRegistry;

    EnumerableSet.Bytes32Set private allUsernames;
    string[] public allUsernamesArray;
    uint64 public nextAttemptId;
    address public verifier; // Backend verifier address

    // Events
    event UsernameRegistered(string onePUser, string name, string img);
    event AccountAttached(string onePUser, address account);
    event AttemptCreated(
        uint64 id,
        string onePUser,
        address hotWallet,
        uint64 difficulty
    );
    event AttemptUpdated(uint64 id, OnePProtocol.Status newStatus);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the OneP contract
     * @param _verifier Address of the backend verifier
     */
    function initialize(address _verifier) public initializer {
        uint256 _initialSupply = 10_000_000 ether; //10M $1P tokens

        uint256 _cap = 100_000_000 ether; //100M $1P tokens
        super._initializeToken(_initialSupply, _cap); // Initialize the parent OnePToken contract

        // Set verifier
        verifier = _verifier;
    }

    // ============ TOKEN ECONOMICS ============

    /**
     * @dev Calculate attempt fee based on Polymarket-style bonding curve
     * @param onePUser Username to get fee for
     * @return attemptFee Fee for the attempt based on failure/success ratio
     */
    function getAttemptFee(
        string memory onePUser
    ) public view returns (uint256 attemptFee) {
        OnePProtocol.UserState memory state = userStateRegistry[onePUser];
        return OnePProtocol.calcAttemptFee(state);
    }

    // ============ 1P PROTOCOL FUNCTIONS ============

    /**
     * @dev Register a new username (Step 1 of 1P Protocol)
     * @param onePUser Username to register (e.g., "alice.1p")
     * @param name Display name for the user
     * @param img Profile image URL
     */
    function register(
        string memory onePUser,
        string memory name,
        string memory img
    ) external nonReentrant {
        require(OnePProtocol.validateUsername(onePUser), "Invalid username");

        require(
            allUsernames.add(keccak256(abi.encodePacked(onePUser))),
            "Username exists"
        );

        // Transfer registration fee to contract
        _transfer(msg.sender, address(this), OnePProtocol.REGISTRATION_FEE);

        // Create user profile
        OnePProtocol.UserProfile memory profile = OnePProtocol.UserProfile({
            name: name,
            img: img,
            account: address(0)
        });

        usernameRegistry[onePUser] = profile;
        allUsernamesArray.push(onePUser);

        emit UsernameRegistered(onePUser, name, img);
    }

    /**
     * @dev Attach custodial account to username (Step 2 of 1P Protocol)
     * @param onePUser Username to attach account to
     * @param account Custodial wallet address
     */
    function attachAccount(
        string memory onePUser,
        address account
    ) external onlyVerifier {
        OnePProtocol.UserProfile storage profile = usernameRegistry[onePUser];
        require(bytes(profile.name).length > 0, "Username not registered");
        require(profile.account == address(0), "Account already set");
        require(OnePProtocol.validateAccount(account), "Invalid account");

        profile.account = account;
        emit AccountAttached(onePUser, account);
    }

    /**
     * @dev Request authentication attempt (Step 3 of 1P Protocol)
     * @param onePUser Username requesting authentication
     */
    function requestAttempt(string memory onePUser) external nonReentrant {
        require(this.usernameExists(onePUser), "Username not registered");

        OnePProtocol.UserProfile storage profile = usernameRegistry[onePUser];

        address onePAccount = profile.account;

        if (onePAccount == address(0)) {
            // fallback: to the platform
            onePAccount = address(this);
        }

        uint256 currentFee = getAttemptFee(onePUser);
        (
            uint256 userShare,
            uint256 verifierShare,
            uint256 platformShare
        ) = OnePProtocol.calculateFeeSplits(currentFee);

        _transfer(msg.sender, address(this), platformShare);
        _transfer(msg.sender, onePAccount, userShare);
        _transfer(msg.sender, verifier, verifierShare);

        _burn(address(this), platformShare); // Burn the platform share

        // Update user state
        OnePProtocol.UserState storage state = userStateRegistry[onePUser];
        if (state.d == 0) {
            state.d = OnePProtocol.MIN_ROUNDS;
        }

        state.totalAttempts++;
        uint64 d = state.d;

        // Create attempt using library
        uint64 attemptId = nextAttemptId++;
        OnePProtocol.Attempt memory attempt = OnePProtocol.createAttempt(
            attemptId,
            onePUser,
            msg.sender,
            d,
            OnePProtocol.ATTEMPT_EXPIRY_DURATION // 10 minutes expiry
        );

        attemptRegistry[attemptId] = attempt;
        emit AttemptCreated(attemptId, onePUser, msg.sender, d);
    }

    /**
     * @dev Update attempt status with progressive validation (only verifier)
     * @param attemptId ID of the attempt to update
     * @param newStatus New status (must be greater than current status)
     */
    function updateAttemptStatus(
        uint64 attemptId,
        OnePProtocol.Status newStatus
    ) external onlyVerifier {
        OnePProtocol.Attempt storage att = attemptRegistry[attemptId];

        if (att.status == OnePProtocol.Status.Pending) {
            require(
                newStatus == OnePProtocol.Status.InProgress,
                "Status must be in progress"
            );
        } else if (att.status == OnePProtocol.Status.InProgress) {
            require(
                newStatus == OnePProtocol.Status.Success ||
                    newStatus == OnePProtocol.Status.Failed,
                "Status must be success or failed"
            );
        } else {
            revert("Attempt used up");
        }

        require(!OnePProtocol.isAttemptExpired(att), "Attempt expired");

        // Update status
        att.status = newStatus;
        emit AttemptUpdated(attemptId, newStatus);

        // Only update user state for final statuses (Success or Failed)
        if (
            newStatus == OnePProtocol.Status.Success ||
            newStatus == OnePProtocol.Status.Failed
        ) {
            OnePProtocol.UserState storage state = userStateRegistry[
                att.onePUser
            ];
            bool isSuccess = (newStatus == OnePProtocol.Status.Success);

            // Update state based on attempt result
            uint64 nowTs = uint64(block.timestamp);

            state.totalAttempts++;

            if (isSuccess) {
                state.successCount++;
            } else {
                state.failureCount++;
                if (state.firstFailureTs == 0) {
                    state.firstFailureTs = nowTs;
                }
                state.lastFailureTs = nowTs;

                // Check for high abuse mode
                if (
                    OnePProtocol.shouldEnterHighAbuse(
                        state.failureCount,
                        state.firstFailureTs,
                        nowTs
                    )
                ) {
                    state.highAbuse = true;
                }
            }

            state.d = OnePProtocol.calculateDifficultyBondingCurve(
                state.totalAttempts,
                state.successCount,
                state.failureCount,
                state.highAbuse
            );
        }
    }

    // ============ VIEW FUNCTIONS ============

    /**
     * @dev Get all attempt IDs
     */
    function getAllAttemptIds() external view returns (uint64[] memory) {
        uint64[] memory ids = new uint64[](nextAttemptId);
        for (uint64 i = 0; i < nextAttemptId; i++) {
            ids[i] = i;
        }
        return ids;
    }

    /**
     * @dev Get all registered usernames
     */
    function getAllUsernames() external view returns (string[] memory) {
        return allUsernamesArray;
    }

    /**
     * @dev Check if username exists
     */
    function usernameExists(
        string memory onePUser
    ) external view returns (bool) {
        bytes32 usernameHash = keccak256(abi.encodePacked(onePUser));
        return allUsernames.contains(usernameHash);
    }

    /**
     * @dev Get user profile by username
     */
    function getUserProfile(
        string memory onePUser
    ) external view returns (OnePProtocol.UserProfile memory) {
        return usernameRegistry[onePUser];
    }

    /**
     * @dev Get user state by username
     */
    function getUserState(
        string memory onePUser
    ) external view returns (OnePProtocol.UserState memory) {
        return userStateRegistry[onePUser];
    }

    /**
     * @dev Get attempt by ID
     */
    function getAttempt(
        uint64 attemptId
    ) external view returns (OnePProtocol.Attempt memory) {
        return attemptRegistry[attemptId];
    }

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Update verifier address (only owner)
     */
    function updateVerifier(address _verifier) external onlyOwner {
        require(_verifier != address(0), "Invalid verifier");
        verifier = _verifier;
    }

    // ============ MODIFIERS ============

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier");
        _;
    }
}
