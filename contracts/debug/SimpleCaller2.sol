// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.8.6;

import "./SimpleCaller.sol";

contract SimpleCaller2 {
    address public simpleCaller;

    constructor(address _sa) {
        simpleCaller = _sa;
    }

    function emitEventExternal(uint256 number) external {
        SimpleCaller(simpleCaller).emitEventExternal(number);
    }
}
