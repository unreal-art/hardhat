// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.6;

import "./Simple.sol";

contract SimpleCaller {
    address public simpleAddress;

    constructor(address _sa) {
        simpleAddress = _sa;
    }

    function emitEventExternal(uint256 number) external {
        Simple(simpleAddress).emitEvent(number);
    }
}
