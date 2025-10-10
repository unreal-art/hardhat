// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OnePProtocol
 * @dev Library containing all 1P Protocol logic and data structures
 * @notice This library provides pure functions and structs for the 1P authentication protocol
 *
 * The 1P Protocol is a quantum-resistant, zero-knowledge authentication system that uses
 * a single UTF-8 character as the secret credential. It introduces a Solver-Verifier framework
 * where the secret is stored exclusively on the Verifier side.
 */
library OnePProtocol {
    // ============ CONSTANTS ============

    uint64 constant MAX_ROUNDS = 10;
    uint256 constant REGISTRATION_FEE = 100 ether; // 100 $1P tokens for registration

    uint64 constant ATTEMPT_EXPIRY_DURATION = 600; // 10 minutes

    // Fee splitting percentages (basis points: 10000 = 100%)
    uint256 constant ATTEMPT_FEE_USER_SHARE = 4000; // 40%
    uint256 constant ATTEMPT_FEE_VERIFIER_SHARE = 4000; // 40%
    uint256 constant ATTEMPT_FEE_PLATFORM_SHARE = 2000; // 20%

    // Token Economics Constants
    uint256 public constant MAX_ATTEMPT_FEE = 1 ether; // Maximum cost per attempt
    uint256 public constant MIN_ATTEMPT_FEE = 0.01 ether; // Minimum cost per attempt

    // ============ ENUMS ============

    enum Status {
        Pending,
        InProgress,
        Success,
        Failed
    }

    // ============ STRUCTS ============

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

    // ============ EVENTS ============

    event UsernameRegistered(string onePUser, string name, string img);
    event AccountAttached(string onePUser, address account);
    event AttemptCreated(
        uint64 id,
        string onePUser,
        address hotWallet,
        uint64 difficulty
    );
    event AttemptUpdated(uint64 id, Status newStatus);

    // ============ VALIDATION FUNCTIONS ============

    /**
     * @dev Validate username format
     * @param onePUser Username to validate
     * @return isValid True if username is valid
     */
    function validateUsername(
        string memory onePUser
    ) internal pure returns (bool isValid) {
        bytes memory usernameBytes = bytes(onePUser);
        return usernameBytes.length > 0 && usernameBytes.length <= 64; // Max 64 chars
    }

    /**
     * @dev Validate account address
     * @param account Address to validate
     * @return isValid True if address is valid
     */
    function validateAccount(
        address account
    ) internal pure returns (bool isValid) {
        return account != address(0);
    }

    /**
     * @dev Validate attempt status transition
     * @param currentStatus Current attempt status
     * @param newStatus New attempt status
     * @return isValid True if transition is valid
     */
    function validateStatusTransition(
        Status currentStatus,
        Status newStatus
    ) internal pure returns (bool isValid) {
        if (currentStatus == Status.Pending && newStatus == Status.InProgress) {
            return true;
        }
        if (
            currentStatus == Status.InProgress &&
            (newStatus == Status.Success || newStatus == Status.Failed)
        ) {
            return true;
        }
    }

    /**
     * @dev Check if new status is greater than current status (progressive update)
     * @param currentStatus Current attempt status
     * @param newStatus New attempt status
     * @return isProgressive True if new status is greater than current
     */
    function isStatusProgressive(
        Status currentStatus,
        Status newStatus
    ) internal pure returns (bool isProgressive) {
        return uint8(newStatus) > uint8(currentStatus);
    }

    // ============ DIFFICULTY CALCULATION ============

    /**
     * @dev Calculate new difficulty based on attempt result
     * @param currentDifficulty Current difficulty level
     * @param isHighAbuse Whether user is in high abuse mode
     * @param isSuccess Whether attempt was successful
     * @return newDifficulty New difficulty level
     */
    function calculateNewDifficulty(
        uint64 currentDifficulty,
        bool isHighAbuse,
        bool isSuccess
    ) internal pure returns (uint64 newDifficulty) {
        if (isSuccess) {
            // On success, maintain or slightly reduce difficulty
            return currentDifficulty > 1 ? currentDifficulty - 1 : 1;
        } else {
            // On failure, increase difficulty
            if (isHighAbuse) {
                return min(MAX_ROUNDS, currentDifficulty * 2);
            } else {
                return min(MAX_ROUNDS, currentDifficulty + 1);
            }
        }
    }

    /**
     * @dev Check if user should enter high abuse mode
     * @param failureCount Number of failures
     * @param firstFailureTs Timestamp of first failure
     * @param currentTs Current timestamp
     * @return shouldEnterHighAbuse True if should enter high abuse mode
     */
    function shouldEnterHighAbuse(
        uint64 failureCount,
        uint64 firstFailureTs,
        uint64 currentTs
    ) internal pure returns (bool) {
        return
            failureCount >= 3 &&
            firstFailureTs > 0 &&
            (currentTs - firstFailureTs) < 3600; // 1 hour
    }

    // ============ ATTEMPT MANAGEMENT ============

    /**
     * @dev Create a new attempt
     * @param attemptId ID for the new attempt
     * @param onePUser Username requesting attempt
     * @param hotWallet Wallet address requesting attempt
     * @param difficulty Current difficulty level
     * @param expiryDuration Duration until attempt expires (in seconds)
     * @return attempt New attempt struct
     */
    function createAttempt(
        uint64 attemptId,
        string memory onePUser,
        address hotWallet,
        uint64 difficulty,
        uint64 expiryDuration
    ) internal view returns (Attempt memory attempt) {
        uint64 nowTs = uint64(block.timestamp);

        return
            Attempt({
                id: attemptId,
                onePUser: onePUser,
                hotWallet: hotWallet,
                expiresAt: nowTs + expiryDuration,
                difficulty: difficulty,
                status: Status.Pending
            });
    }

    /**
     * @dev Check if attempt is expired
     * @param attempt Attempt to check
     * @return isExpired True if attempt is expired
     */
    function isAttemptExpired(
        Attempt memory attempt
    ) internal view returns (bool isExpired) {
        return block.timestamp >= attempt.expiresAt;
    }

    /**
     * @dev Update attempt status
     * @param attempt Attempt to update
     * @param newStatus New status
     * @return updatedAttempt Updated attempt
     */
    function updateAttemptStatus(
        Attempt memory attempt,
        Status newStatus
    ) internal pure returns (Attempt memory updatedAttempt) {
        attempt.status = newStatus;
        return attempt;
    }

    // ============ USER STATE MANAGEMENT ============

    /**
     * @dev Initialize user state
     * @return state Initialized user state
     */
    function initializeUserState()
        internal
        pure
        returns (UserState memory state)
    {
        return
            UserState({
                totalAttempts: 0,
                successCount: 0,
                failureCount: 0,
                firstFailureTs: 0,
                lastFailureTs: 0,
                d: 1, // Start with difficulty 1
                highAbuse: false
            });
    }

    /**
     * @dev Update user state after attempt
     * @param state Current user state
     * @param isSuccess Whether attempt was successful
     * @return updatedState Updated user state
     */
    function updateUserStateAfterAttempt(
        UserState memory state,
        bool isSuccess
    ) internal view returns (UserState memory updatedState) {
        state.totalAttempts++;
        uint64 nowTs = uint64(block.timestamp);

        if (isSuccess) {
            state.successCount++;
            // Reduce difficulty on success
            state.d = state.d > 1 ? state.d - 1 : 1;
        } else {
            state.failureCount++;
            if (state.firstFailureTs == 0) {
                state.firstFailureTs = nowTs;
            }
            state.lastFailureTs = nowTs;

            // Check for high abuse mode
            if (
                shouldEnterHighAbuse(
                    state.failureCount,
                    state.firstFailureTs,
                    nowTs
                )
            ) {
                state.highAbuse = true;
            }

            // Increase difficulty
            state.d = calculateNewDifficulty(state.d, state.highAbuse, false);
        }

        return state;
    }

    // ============ FEE CALCULATION ============

    /**
     * @dev Calculate dynamic attempt fee based on bonding curve
     * @param baseFee Base fee for attempts
     * @param feeMultiplier Multiplier for bonding curve
     * @param totalSupply Current total token supply
     * @param maxCost Maximum cost per attempt
     * @param minCost Minimum cost per attempt
     * @return fee Calculated attempt fee
     */
    function calculateAttemptFee(
        uint256 baseFee,
        uint256 feeMultiplier,
        uint256 totalSupply,
        uint256 maxCost,
        uint256 minCost
    ) internal pure returns (uint256 fee) {
        uint256 calculatedFee = baseFee + (totalSupply / 1e18) * feeMultiplier;

        if (calculatedFee > maxCost) {
            return maxCost;
        } else if (calculatedFee < minCost) {
            return minCost;
        } else {
            return calculatedFee;
        }
    }

    // ============ UTILITY FUNCTIONS ============

    /**
     * @dev Get minimum of two uint64 values
     * @param a First value
     * @param b Second value
     * @return result Minimum value
     */
    function min(uint64 a, uint64 b) internal pure returns (uint64 result) {
        return a < b ? a : b;
    }

    /**
     * @dev Get maximum of two uint64 values
     * @param a First value
     * @param b Second value
     * @return result Maximum value
     */
    function max(uint64 a, uint64 b) internal pure returns (uint64 result) {
        return a > b ? a : b;
    }

    /**
     * @dev Calculate rounds based on difficulty
     * @param difficulty Difficulty level
     * @return rounds Number of rounds
     */
    function calculateRounds(
        uint64 difficulty
    ) internal pure returns (uint64 rounds) {
        return difficulty + (difficulty / 2); // r = d + floor(d/2)
    }

    /**
     * @dev Calculate fee splits with proper rounding handling
     * @param totalFee Total fee to split
     * @return userShare User's share of the fee
     * @return verifierShare Verifier's share of the fee
     * @return platformShare Platform's share of the fee
     */
    function calculateFeeSplits(
        uint256 totalFee
    )
        internal
        pure
        returns (
            uint256 userShare,
            uint256 verifierShare,
            uint256 platformShare
        )
    {
        // Calculate shares using basis points to avoid rounding issues
        userShare = (totalFee * ATTEMPT_FEE_USER_SHARE) / 10000;
        verifierShare = (totalFee * ATTEMPT_FEE_VERIFIER_SHARE) / 10000;
        platformShare = (totalFee * ATTEMPT_FEE_PLATFORM_SHARE) / 10000;

        // Handle any remainder due to rounding by adding it to platform share
        uint256 totalSplit = userShare + verifierShare + platformShare;
        if (totalSplit < totalFee) {
            platformShare += (totalFee - totalSplit);
        }
    }

    /**
     * @dev Calculate delay based on difficulty
     * @param difficulty Difficulty level
     * @return delay Delay in seconds
     */
    function calculateDelay(
        uint64 difficulty
    ) internal pure returns (uint64 delay) {
        return min(60, difficulty); // Cap at 60 seconds
    }
}
