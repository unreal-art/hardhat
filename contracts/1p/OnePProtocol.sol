// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/math/Math.sol";

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
    uint64 constant MIN_ROUNDS = 2;
    uint64 constant MAX_ROUNDS = 11;
    uint256 constant REGISTRATION_FEE = 100 ether; // 100 $1P tokens for registration
    uint256 constant SCALE = 10000; // Fixed-point scaling factor for precision

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
     * @dev Calculate difficulty using bonding curve based on user's success/failure ratio
     * @param totalAttempts Total number of attempts made
     * @param successCount Number of successful attempts
     * @param isHighAbuse Whether user is in high abuse mode
     * @return difficulty Calculated difficulty level
     */
    function calculateDifficultyBondingCurve(
        uint64 totalAttempts,
        uint64 successCount,
        uint64 /* failureCount */,
        bool isHighAbuse
    ) internal pure returns (uint64 difficulty) {
        if (totalAttempts == 0) {
            return MIN_ROUNDS;
        }

        // Calculate success rate (0 to 1, scaled to SCALE for precision)
        uint256 successRate = (uint256(successCount) * SCALE) /
            uint256(totalAttempts);

        // Base difficulty calculation using inverse relationship with success rate
        // Higher success rate = lower difficulty, but with exponential scaling
        // Formula: MIN_ROUNDS + (MAX_ROUNDS - MIN_ROUNDS) * ((SCALE - successRate) / SCALE)^2.5
        // Using integer-safe computation: x^2.5 = x^2 * sqrt(x) with fixed-point scaling

        uint256 inverseSuccessRate = SCALE - successRate;

        // Compute x^2 with scaling: sq = (inverseSuccessRate * inverseSuccessRate) / SCALE
        uint256 sq = (inverseSuccessRate * inverseSuccessRate) / SCALE;

        // Compute sqrt(x) with scaling: root = sqrt(inverseSuccessRate * SCALE) / sqrt(SCALE)
        // This gives us sqrt(x) scaled by sqrt(SCALE)
        uint256 scaledValue = inverseSuccessRate * SCALE;
        uint256 root = Math.sqrt(scaledValue);

        // Compute x^2.5 = (sq * root) / SCALE to maintain consistent scaling
        uint256 curveExponent = (sq * root) / SCALE;

        uint256 difficultyRange = MAX_ROUNDS - MIN_ROUNDS;
        uint256 calculatedDifficulty = MIN_ROUNDS +
            (difficultyRange * curveExponent) /
            SCALE;

        // Apply high abuse multiplier (exponential penalty)
        if (isHighAbuse) {
            // High abuse mode: multiply by 2 and cap at MAX_ROUNDS
            calculatedDifficulty = calculatedDifficulty * 2;
            if (calculatedDifficulty > MAX_ROUNDS) {
                return MAX_ROUNDS;
            }
        }

        // Ensure we stay within bounds
        if (calculatedDifficulty < MIN_ROUNDS) {
            return MIN_ROUNDS;
        } else if (calculatedDifficulty > MAX_ROUNDS) {
            return MAX_ROUNDS;
        } else {
            return uint64(calculatedDifficulty);
        }
    }

    /**
     * @dev Calculate new difficulty based on attempt result using bonding curve
     * @param totalAttempts Total number of attempts made
     * @param successCount Number of successful attempts
     * @param failureCount Number of failed attempts
     * @param isHighAbuse Whether user is in high abuse mode
     * @param isSuccess Whether attempt was successful
     * @return newDifficulty New difficulty level
     */
    function calculateNewDifficulty(
        uint64 /* currentDifficulty */,
        uint64 totalAttempts,
        uint64 successCount,
        uint64 failureCount,
        bool isHighAbuse,
        bool isSuccess
    ) internal pure returns (uint64 newDifficulty) {
        // Update counts for the current attempt
        uint64 newTotalAttempts = totalAttempts + 1;
        uint64 newSuccessCount = isSuccess ? successCount + 1 : successCount;
        uint64 newFailureCount = isSuccess ? failureCount : failureCount + 1;

        // Calculate new difficulty using bonding curve
        return
            calculateDifficultyBondingCurve(
                newTotalAttempts,
                newSuccessCount,
                newFailureCount,
                isHighAbuse
            );
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
                d: MIN_ROUNDS, // Start with minimum difficulty
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
        uint64 nowTs = uint64(block.timestamp);

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
                shouldEnterHighAbuse(
                    state.failureCount,
                    state.firstFailureTs,
                    nowTs
                )
            ) {
                state.highAbuse = true;
            }
        }

        state.totalAttempts++;
        // Always update difficulty using bonding curve based on current state
        state.d = calculateDifficultyBondingCurve(
            state.totalAttempts,
            state.successCount,
            state.failureCount,
            state.highAbuse
        );

        return state;
    }

    // ============ FEE CALCULATION ============

    /**
     * @dev Calculate attempt fee using Polymarket-style bonding curve
     * @param state User state containing success/failure counts
     * @return fee Calculated attempt fee
     */
    function calcAttemptFee(
        UserState memory state
    ) internal pure returns (uint256 fee) {
        uint64 successCount = state.successCount;
        uint64 failureCount = state.failureCount;

        // If no attempts yet, use minimum fee
        if (successCount == 0 && failureCount == 0) {
            return MIN_ATTEMPT_FEE;
        }

        // Polymarket-style bonding curve: failureCount^2 / (failureCount^2 + successCount)
        // This creates higher fees for users with more failures
        // Square the failure count for the bonding curve calculation
        uint256 failureCountSquared = failureCount * failureCount;
        uint256 denominator = failureCountSquared + uint256(successCount);

        // Calculate fee ratio (0 to 1, scaled to 10000 for precision)
        uint256 feeRatio = (failureCountSquared * 10000) / denominator;

        // Apply fee range: MIN_ATTEMPT_FEE to MAX_ATTEMPT_FEE
        uint256 feeRange = MAX_ATTEMPT_FEE - MIN_ATTEMPT_FEE;

        // Calculate fee: minFee + (feeRange * feeRatio / 10000)
        uint256 calculatedFee = MIN_ATTEMPT_FEE + (feeRange * feeRatio) / 10000;

        // Ensure we stay within bounds
        if (calculatedFee > MAX_ATTEMPT_FEE) {
            return MAX_ATTEMPT_FEE;
        } else if (calculatedFee < MIN_ATTEMPT_FEE) {
            return MIN_ATTEMPT_FEE;
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
