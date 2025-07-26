// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ContractB {
    event EventEmitted(address indexed sender);

    function emitEvent() external {
        emit EventEmitted(msg.sender);
    }
}

contract ContractA {
    ContractB public contractB;

    constructor(ContractB _contractB) {
        contractB = _contractB;
    }

    function callContractBMethod() external {
        contractB.emitEvent();
    }
}
