// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.6;

contract Simple {
    event SimpleEvent(uint256 indexed number, uint256 indexed time);

    function emitEvent(uint256 number) public {
        emit SimpleEvent(number, block.timestamp);
    }
}
