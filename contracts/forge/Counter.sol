// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

contract Counter {
    uint256 public number;

    uint256 private deadline = 2 days;

    function setNumber(uint256 newNumber) public {
        number = newNumber;
    }

    function increment() public {
        number++;
    }

    function echidna_check_number() public returns (bool) {
        return number < 100110000;
    }
}
