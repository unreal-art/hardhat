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
 * @title OnePToken
 * @dev Parent contract containing all token economics and ERC20 functionality
 * @notice This contract provides the base token functionality that can be extended by child contracts
 *
 * Key Features:
 * - ERC20 token with upgradeable functionality
 * - Dynamic pricing based on bonding curves
 * - Owner-controlled minting and burning
 * - Pausable functionality
 * - Permit functionality for gasless approvals
 * - Fee management and token economics
 */
contract OnePToken is
    Initializable,
    ERC20PermitUpgradeable,
    ERC20PausableUpgradeable,
    ERC20CappedUpgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initialize the OnePToken contract
     * @param _initialSupply Initial token supply to mint
     * @param _cap Maximum token supply cap
     */
    function initializeToken(
        uint256 _initialSupply,
        uint256 _cap
    ) public initializer {
        _initializeToken(_initialSupply, _cap);
    }

    function _initializeToken(uint256 _initialSupply, uint256 _cap) internal {
        // cuz we are using integrated Token+Contract method
        string memory name_ = "1P Token";
        string memory symbol_ = "1P";

        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        __ERC20Capped_init(_cap);
        __Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        address _initialOwner = msg.sender;

        // Mint initial supply to the initial owner
        _mint(_initialOwner, _initialSupply);
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
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from account
     * @notice Only the owner of the token or the token holder can burn tokens
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
     * @dev Override decimals to return 18 (standard for $1P)
     */
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
