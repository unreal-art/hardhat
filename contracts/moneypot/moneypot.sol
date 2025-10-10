// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract MoneyPotManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant DIFFICULTY_MOD = 3;
    uint256 public constant HUNTER_SHARE_PERCENT = 40;
    uint256 public constant CREATOR_ENTRY_FEE_SHARE_PERCENT = 50;

    // Immutable state
    IERC20 public immutable usdcToken;
    address public immutable trustedOracle;
    address public immutable platformAddress;

    // Structs
    struct MoneyPot {
        uint256 id;
        address creator;
        uint256 totalAmount;
        uint256 fee;
        uint256 createdAt;
        uint256 expiresAt;
        bool isActive;
        uint256 attemptsCount;
        address oneFaAddress;
    }

    struct Attempt {
        uint256 id;
        uint256 potId;
        address hunter;
        uint256 expiresAt;
        uint256 difficulty;
        bool isCompleted;
    }

    // State
    uint256 public nextPotId;
    uint256 public nextAttemptId;
    mapping(uint256 => MoneyPot) public pots;
    mapping(uint256 => Attempt) public attempts;
    uint256[] private potIds;

    // Events
    event PotCreated(
        uint256 indexed id,
        address indexed creator,
        uint256 timestamp
    );
    event PotAttempted(
        uint256 indexed attemptId,
        uint256 indexed potId,
        address indexed hunter,
        uint256 timestamp
    );
    event PotSolved(
        uint256 indexed potId,
        address indexed hunter,
        uint256 timestamp
    );
    event PotFailed(
        uint256 indexed attemptId,
        address indexed hunter,
        uint256 timestamp
    );
    event PotExpired(
        uint256 indexed potId,
        address indexed creator,
        uint256 timestamp
    );

    // Errors
    error InvalidFee();
    error PotNotActive();
    error ExpiredPot();
    error NotExpired();
    error AttemptExpired();
    error AttemptCompleted();
    error Unauthorized();

    constructor(
        address _usdcToken,
        address _trustedOracle,
        address _platformAddress
    ) {
        usdcToken = IERC20(_usdcToken);
        trustedOracle = _trustedOracle;
        platformAddress = _platformAddress;
    }

    function createPot(
        uint256 amount,
        uint256 durationSeconds,
        uint256 fee,
        address oneFaAddress
    ) external nonReentrant returns (uint256) {
        if (fee > amount) revert InvalidFee();

        uint256 id = nextPotId++;

        pots[id] = MoneyPot({
            id: id,
            creator: msg.sender,
            totalAmount: amount,
            fee: fee,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + durationSeconds,
            isActive: true,
            attemptsCount: 0,
            oneFaAddress: oneFaAddress
        });

        potIds.push(id);
        usdcToken.safeTransferFrom(msg.sender, address(this), amount);

        emit PotCreated(id, msg.sender, block.timestamp);
        return id;
    }

    function attemptPot(uint256 potId) external nonReentrant returns (uint256) {
        MoneyPot storage pot = pots[potId];

        if (!pot.isActive) revert PotNotActive();
        if (block.timestamp >= pot.expiresAt) revert ExpiredPot();

        uint256 entryFee = pot.fee;
        uint256 creatorShare = (entryFee * CREATOR_ENTRY_FEE_SHARE_PERCENT) /
            100;
        uint256 platformShare = entryFee - creatorShare;

        usdcToken.safeTransferFrom(msg.sender, pot.creator, creatorShare);
        usdcToken.safeTransferFrom(msg.sender, platformAddress, platformShare);

        pot.attemptsCount++;

        uint256 attemptId = nextAttemptId++;
        uint256 difficulty = (pot.attemptsCount % DIFFICULTY_MOD) + 2;

        attempts[attemptId] = Attempt({
            id: attemptId,
            potId: potId,
            hunter: msg.sender,
            expiresAt: block.timestamp + 300,
            difficulty: difficulty,
            isCompleted: false
        });

        emit PotAttempted(attemptId, potId, msg.sender, block.timestamp);
        return attemptId;
    }

    function attemptCompleted(
        uint256 attemptId,
        bool status
    ) external nonReentrant {
        if (msg.sender != trustedOracle) revert Unauthorized();

        Attempt storage attempt = attempts[attemptId];
        MoneyPot storage pot = pots[attempt.potId];

        if (!pot.isActive) revert PotNotActive();
        if (block.timestamp >= pot.expiresAt) revert ExpiredPot();
        if (block.timestamp >= attempt.expiresAt) revert AttemptExpired();
        if (attempt.isCompleted) revert AttemptCompleted();

        attempt.isCompleted = true;

        if (status) {
            pot.isActive = false;

            uint256 hunterShare = (pot.totalAmount * HUNTER_SHARE_PERCENT) /
                100;
            uint256 platformShare = pot.totalAmount - hunterShare;

            usdcToken.safeTransfer(attempt.hunter, hunterShare);
            usdcToken.safeTransfer(platformAddress, platformShare);

            emit PotSolved(attempt.potId, attempt.hunter, block.timestamp);
        } else {
            emit PotFailed(attemptId, attempt.hunter, block.timestamp);
        }
    }

    function expirePot(uint256 potId) external nonReentrant {
        MoneyPot storage pot = pots[potId];

        if (!pot.isActive) revert PotNotActive();
        if (block.timestamp < pot.expiresAt) revert NotExpired();

        pot.isActive = false;
        usdcToken.safeTransfer(pot.creator, pot.totalAmount);

        emit PotExpired(potId, pot.creator, block.timestamp);
    }

    // View functions
    function getBalance(address account) external view returns (uint256) {
        return usdcToken.balanceOf(account);
    }

    function getPots() external view returns (uint256[] memory) {
        return potIds;
    }

    function getActivePots() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < potIds.length; i++) {
            if (pots[potIds[i]].isActive) count++;
        }

        uint256[] memory active = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < potIds.length; i++) {
            if (pots[potIds[i]].isActive) {
                active[index++] = potIds[i];
            }
        }
        return active;
    }

    function getPot(uint256 potId) external view returns (MoneyPot memory) {
        return pots[potId];
    }

    function getAttempt(
        uint256 attemptId
    ) external view returns (Attempt memory) {
        return attempts[attemptId];
    }
}
