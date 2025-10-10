// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract OneP is Ownable {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    IERC20 public onePToken;

    uint256 constant REGISTRATION_FEE = 100 ether; // 100 $1P
    uint256 constant ATTEMPT_FEE = 1 ether; // 1 $1P
    uint64 constant MAX_ROUNDS = 30;

    enum Status {
        Pending,
        InProgress,
        Success,
        Failed
    }

    struct UserProfile {
        string name;
        string img; // URL
        address account; // Custodial, set once by verifier
    }

    struct UserState {
        uint64 totalAttempts;
        uint64 successCount;
        uint64 failureCount;
        uint64 firstFailureTs;
        uint64 lastFailureTs;
        uint64 d; // difficulty
        bool highAbuse;
    }

    struct Attempt {
        uint64 id;
        string onePUser;
        address hotWallet;
        uint64 expiresAt;
        uint64 difficulty;
        Status status;
    }

    // Registries
    mapping(string => UserProfile) public usernameRegistry; // username.1p => profile
    mapping(string => UserState) public userStateRegistry; // username.1p => state
    mapping(uint64 => Attempt) public attemptRegistry;

    EnumerableSet.Bytes32Set private allUsernames; // For quick existence checks (contains) using keccak256(onePUser)
    string[] public allUsernamesArray; // For enumeration (getAllUsernames)

    uint64 public nextAttemptId;
    address public verifier; // Backend

    event UsernameRegistered(string onePUser, string name, string img);
    event AccountAttached(string onePUser, address account);
    event AttemptCreated(
        uint64 id,
        string onePUser,
        address hotWallet,
        uint64 difficulty
    );
    event AttemptUpdated(uint64 id, Status newStatus);

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier");
        _;
    }

    constructor(address _onePToken, address _verifier) {
        onePToken = IERC20(_onePToken);
        verifier = _verifier;
    }

    // Step 1: User registers username, pays fee, sets name/img (no account yet)
    function register(
        string memory onePUser,
        string memory name,
        string memory img
    ) external {
        require(bytes(onePUser).length > 0, "Invalid username");
        bytes32 usernameHash = keccak256(abi.encodePacked(onePUser));
        require(!allUsernames.contains(usernameHash), "Username exists");

        onePToken.transferFrom(msg.sender, address(this), REGISTRATION_FEE);

        usernameRegistry[onePUser] = UserProfile({
            name: name,
            img: img,
            account: address(0)
        });

        allUsernames.add(usernameHash);
        allUsernamesArray.push(onePUser);

        emit UsernameRegistered(onePUser, name, img);
    }

    // Step 2: Verifier attaches account (once only)
    function attachAccount(
        string memory onePUser,
        address account
    ) external onlyVerifier {
        UserProfile storage profile = usernameRegistry[onePUser];
        require(bytes(profile.name).length > 0, "Username not registered");
        require(profile.account == address(0), "Account already set");
        require(account != address(0), "Invalid account");

        profile.account = account;

        emit AccountAttached(onePUser, account);
    }

    function requestAttempt(string memory onePUser) external {
        bytes32 usernameHash = keccak256(abi.encodePacked(onePUser));
        require(allUsernames.contains(usernameHash), "Username not registered");

        onePToken.transferFrom(msg.sender, address(this), ATTEMPT_FEE);

        UserState storage state = userStateRegistry[onePUser];
        if (state.d == 0) {
            state.d = 1;
        }
        uint64 d = state.d;
        state.totalAttempts++;

        uint64 attemptId = nextAttemptId++;
        uint64 nowTs = uint64(block.timestamp);
        attemptRegistry[attemptId] = Attempt({
            id: attemptId,
            onePUser: onePUser,
            hotWallet: msg.sender,
            expiresAt: nowTs + 300,
            difficulty: d,
            status: Status.Pending
        });

        emit AttemptCreated(attemptId, onePUser, msg.sender, d);
    }

    function setInProgress(uint64 attemptId) external onlyVerifier {
        Attempt storage att = attemptRegistry[attemptId];
        require(att.status == Status.Pending, "Not pending");
        require(block.timestamp < att.expiresAt, "Expired");
        att.status = Status.InProgress;
        emit AttemptUpdated(attemptId, Status.InProgress);
    }

    function updateAttempt(
        uint64 attemptId,
        Status newStatus
    ) external onlyVerifier {
        require(
            newStatus == Status.Success || newStatus == Status.Failed,
            "Invalid status"
        );
        Attempt storage att = attemptRegistry[attemptId];
        require(att.status == Status.InProgress, "Not in progress");
        require(block.timestamp < att.expiresAt, "Expired");
        att.status = newStatus;
        emit AttemptUpdated(attemptId, newStatus);

        UserState storage state = userStateRegistry[att.onePUser];
        uint64 nowTs = uint64(block.timestamp);
        if (newStatus == Status.Failed) {
            state.failureCount++;
            if (state.firstFailureTs == 0) state.firstFailureTs = nowTs;
            state.lastFailureTs = nowTs;
            if (
                state.failureCount >= 3 && nowTs - state.firstFailureTs < 3600
            ) {
                state.highAbuse = true;
            }
            state.d = state.highAbuse
                ? min(MAX_ROUNDS, state.d * 2)
                : min(MAX_ROUNDS, state.d + 1);
        } else if (newStatus == Status.Success) {
            state.successCount++;
        }
    }

    // View methods
    function getAllAttemptIds() external view returns (uint64[] memory) {
        uint64[] memory ids = new uint64[](nextAttemptId);
        for (uint64 i = 0; i < nextAttemptId; i++) {
            ids[i] = i;
        }
        return ids;
    }

    function getAllUsernames() external view returns (string[] memory) {
        return allUsernamesArray;
    }

    // Existence check using EnumerableSet
    function usernameExists(
        string memory onePUser
    ) external view returns (bool) {
        bytes32 usernameHash = keccak256(abi.encodePacked(onePUser));
        return allUsernames.contains(usernameHash);
    }

    function min(uint64 a, uint64 b) internal pure returns (uint64) {
        return a < b ? a : b;
    }
}
