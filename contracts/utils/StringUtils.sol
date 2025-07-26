// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

/// @title StringUtils
/// @notice Utility library for common string operations
library StringUtils {
    /// @notice Checks if a string is empty
    function isEmpty(string memory str) internal pure returns (bool) {
        return length(str) == 0;
    }

    /// @notice Compares two strings for equality
    function equal(
        string memory a,
        string memory b
    ) internal pure returns (bool) {
        return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
    }

    /// @notice Checks if string `a` starts with `prefix`
    function startsWith(
        string memory a,
        string memory prefix
    ) internal pure returns (bool) {
        bytes memory aBytes = bytes(a);
        bytes memory prefixBytes = bytes(prefix);
        if (prefixBytes.length > aBytes.length) return false;

        for (uint256 i = 0; i < prefixBytes.length; i++) {
            if (aBytes[i] != prefixBytes[i]) return false;
        }
        return true;
    }

    /// @notice Checks if string `a` ends with `suffix`
    function endsWith(
        string memory a,
        string memory suffix
    ) internal pure returns (bool) {
        bytes memory aBytes = bytes(a);
        bytes memory suffixBytes = bytes(suffix);
        if (suffixBytes.length > aBytes.length) return false;

        uint256 offset = aBytes.length - suffixBytes.length;
        for (uint256 i = 0; i < suffixBytes.length; i++) {
            if (aBytes[offset + i] != suffixBytes[i]) return false;
        }
        return true;
    }

    /// @notice Returns the length of a string
    function length(string memory str) internal pure returns (uint256) {
        return bytes(str).length;
    }

    /// @notice Converts a string to lowercase (ASCII only)
    function toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        for (uint256 i = 0; i < bStr.length; i++) {
            // A-Z = 65-90; a-z = 97-122
            if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
                bStr[i] = bytes1(uint8(bStr[i]) + 32);
            }
        }
        return string(bStr);
    }

    /// @notice Converts a string to uppercase (ASCII only)
    function toUpper(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        for (uint256 i = 0; i < bStr.length; i++) {
            // a-z = 97–122; A-Z = 65–90
            if (bStr[i] >= 0x61 && bStr[i] <= 0x7A) {
                bStr[i] = bytes1(uint8(bStr[i]) - 32);
            }
        }
        return string(bStr);
    }

    function split(
        string memory str,
        string memory delimiter
    ) internal pure returns (string[] memory) {
        bytes memory strBytes = bytes(str);
        bytes memory delimiterBytes = bytes(delimiter);
        require(
            delimiterBytes.length == 1,
            "Only single char delimiter supported"
        );

        uint count = 1;
        for (uint i = 0; i < strBytes.length; i++) {
            if (strBytes[i] == delimiterBytes[0]) {
                count++;
            }
        }

        string[] memory parts = new string[](count);
        uint partIndex = 0;
        uint lastIndex = 0;

        for (uint i = 0; i <= strBytes.length; i++) {
            // If we reach the delimiter or end of string, slice substring
            if (i == strBytes.length || strBytes[i] == delimiterBytes[0]) {
                bytes memory part = new bytes(i - lastIndex);
                for (uint j = lastIndex; j < i; j++) {
                    part[j - lastIndex] = strBytes[j];
                }
                parts[partIndex] = string(part);
                partIndex++;
                lastIndex = i + 1;
            }
        }

        return parts;
    }
}
