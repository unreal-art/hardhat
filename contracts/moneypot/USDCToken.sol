// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

/**
 * @title USDCToken
 * @dev USDC token contract with hardcoded supply and cap
 * @notice This contract provides USDC token functionality with upgradeable features
 *
 * Key Features:
 * - ERC20 token with upgradeable functionality
 * - Hardcoded initial supply: 1,000,000 USDC (1M tokens)
 * - Hardcoded cap: 10,000,000 USDC (10M tokens)
 * - Owner-controlled minting and burning
 * - Pausable functionality
 * - Permit functionality for gasless approvals
 * - 6 decimals (standard for USDC)
 */
contract USDCToken is
    Initializable,
    ERC20PermitUpgradeable,
    ERC20PausableUpgradeable,
    ERC20CappedUpgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    // Constants
    uint256 public constant INITIAL_SUPPLY = 10_000_000 * 10 ** 6; // 10M USDC with 6 decimals
    uint256 public constant MAX_SUPPLY = 10_000_000_000 * 10 ** 6; // 10000M USDC with 6 decimals

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the USDCToken contract
     */
    function initializeToken() public {
        // cuz we are using integrated Token+Contract method
        string memory name_ = "Money Pot";
        string memory symbol_ = "USDC";

        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        __ERC20Capped_init(MAX_SUPPLY);
        __Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        address _initialOwner = msg.sender;

        // Mint initial supply to the initial owner
        _mint(_initialOwner, INITIAL_SUPPLY);
    }

    /**
     * @dev Authorize contract upgrades (only owner)
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // ============ ADMIN FUNCTIONS ============

    /**
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @dev Mint tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from account (only owner)
     * @param from Address to burn tokens from
     * @param amount Amount of tokens to burn
     */
    function burn(address from, uint256 amount) external {
        require(
            msg.sender == from || msg.sender == owner(),
            "Only the owner of the token or the token holder can burn tokens"
        );
        _burn(from, amount);
    }

    // ============ INTERNAL FUNCTIONS ============

    /**
     * @dev Override _mint to respect cap
     */
    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20CappedUpgradeable) {
        super._mint(to, amount);
    }

    /**
     * @dev Override _beforeTokenTransfer to handle all token transfers
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Override decimals to return 6 (standard for USDC)
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}
