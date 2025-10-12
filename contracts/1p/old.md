````solidity
    // ============ TOKEN ECONOMICS ============

    /**
     * @dev Calculate attempt fee based on user's difficulty level using mathematical bonding curve
     * @param onePUser Username to get difficulty for
     * @return attemptFee Fee for the attempt based on difficulty
     */
    function getAttemptFee(
        string memory onePUser
    ) public view returns (uint256 attemptFee) {
        OnePProtocol.UserState memory state = userStateRegistry[onePUser];
        uint64 difficulty = state.d == 0 ? OnePProtocol.MIN_ROUNDS : state.d; // Default to MIN_ROUNDS if not set

        // Mathematical bonding curve: exponential growth with controlled bounds
        // Formula: minFee + (maxFee - minFee) * (difficulty^2.5) / (MAX_ROUNDS^2.5)
        // This creates a curve that starts slow and accelerates

        uint256 minFee = OnePProtocol.MIN_ATTEMPT_FEE; // 0.01 ETH
        uint256 maxFee = OnePProtocol.MAX_ATTEMPT_FEE; // 1 ETH
        uint256 maxRounds = OnePProtocol.MAX_ROUNDS; // 10

        // Calculate the curve: difficulty^2.5 / maxRounds^2.5
        // Using fixed-point arithmetic to avoid floating point
        uint256 difficultyScaled = uint256(difficulty) * uint256(difficulty);
        difficultyScaled = difficultyScaled * uint256(difficulty); // difficulty^3
        difficultyScaled = difficultyScaled / 2; // Approximate difficulty^2.5

        uint256 maxRoundsScaled = maxRounds * maxRounds;
        maxRoundsScaled = maxRoundsScaled * maxRounds; // maxRounds^3
        maxRoundsScaled = maxRoundsScaled / 2; // Approximate maxRounds^2.5

        uint256 decimals = this.decimals();
        // Calculate fee using the curve
        uint256 feeRange = maxFee - minFee;
        uint256 curveMultiplier = (difficultyScaled * decimals) /
            maxRoundsScaled;
        uint256 additionalFee = (feeRange * curveMultiplier) / decimals;

        uint256 calculatedFee = minFee + additionalFee;

        // Ensure we stay within bounds
        if (calculatedFee > maxFee) {
            return maxFee;
        } else if (calculatedFee < minFee) {
            return minFee;
        } else {
            return calculatedFee;
        }
    }

    ```
````
