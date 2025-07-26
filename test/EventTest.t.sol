// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../contracts/forge/ContractA.sol";

contract ContractATest is Test {
    ContractA public contractA;
    ContractB public contractB;

    function setUp() public {
        // Deploy ContractB first
        contractB = new ContractB();
        // Deploy ContractA with ContractB's address
        contractA = new ContractA(contractB);
    }

    function testContractAEmitsEventFromContractB() public {
        // Listen for ContractB's event
        vm.expectEmit(true, false, false, true);
        // vm.expectEmit();

        // vm.expectEmit(address(contractA));

        emit ContractB.EventEmitted(address(this));

        // Call method from ContractA which should emit an event from ContractB
        contractA.callContractBMethod();

        // contractB.emitEvent();
    }
}
