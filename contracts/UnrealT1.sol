// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PermitUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20CappedUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20BurnableUpgradeable.sol";

// TODO:
// For proxy routing usecase

// 1. Burn balance should be Erc20 token not mapping
// 2. Users should be able to transferFrom burnBalance , increaseAllowance at $UNREAL token cost . But rest like normal transfer disabled.

// 3. $UNREAL burned has no utility, its used to proxy requests
// 4. Proxy :

// New major changes

// transfer: Only whitelisted addresses can transfer: mapping(address => bool) public whitelisted; including owner
// Max pay at a time is MAX_COST = 1ether
// Min pay at a time is MIN_COST = 1wei=
// TODO: name should be hardcoded and lets use a good emoji if its okay

contract UnrealT1 is
    Initializable,
    ERC20PermitUpgradeable,
    ERC20PausableUpgradeable,
    ERC20CappedUpgradeable,
    ERC20BurnableUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    uint256 public constant COST = 1 ether; // 1 $UNREAL token with 18 decimals
    // address mapped to (epoch => amount)
    mapping(address => mapping(uint256 => uint256)) public burnBalance;
    uint256 public burnEpoch = 0;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
        // can only deploy via proxy
    }

    function initialize(uint256 initialSupply) public initializer {
        string memory name_ = "Unreal T1";
        string memory symbol_ = "UNREAL";
        uint256 MAX_SUPPLY = 2_500_000_000 ether; //2.5B $UNREAL tokens

        __ERC20_init(name_, symbol_);
        __ERC20Permit_init(name_);
        __ERC20Capped_init(MAX_SUPPLY);
        __Pausable_init();
        __Ownable_init();
        __ReentrancyGuard_init();

        _mint(msg.sender, initialSupply);
    }

    // --- Pausable ---
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // --- Minting ---
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    // --- Burning ---
    function burn(address from, uint256 amount) external onlyOwner {
        super._burn(from, amount); //Punishment not burn token
    }

    function _burn(address from, uint256 amount) internal override {
        super._burn(from, amount);
        burnBalance[from][burnEpoch] += amount;
    }

    // FIXME: no need of burn epochs and all
    function incrementBurnEpoch() external onlyOwner {
        burnEpoch++;
    }

    // FIXME: penialize with Burned Tokens if exist.
    // --- Owner-only: Slash Burn Options ---
    event BurnOptionsSlashed(
        address indexed account,
        uint256 epoch,
        uint256 amount
    );

    function slashBurnOptions(
        address account,
        uint256 amount
    ) external onlyOwner {
        burnBalance[account][burnEpoch] -= amount; //underflow: protected
        emit BurnOptionsSlashed(account, burnEpoch, amount);
    }

    // --- Transfer From with Cost Enforcement and Burning ---
    // nonReentrant is kept for transferFrom as it interacts with external accounts and has custom logic
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override nonReentrant returns (bool) {
        require(from != to, "Sender and recipient cannot be the same");
        require(msg.sender == to, "Only the recipient can call transferFrom"); //Anyone with allowance can call
        // require(amount == COST, "Amount must be exactly equal to the cost");
        super.transferFrom(from, to, amount);
        _burn(to, amount);
        return true;
    }

    // --- Transfer with Whole Token Enforcement ---
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(
            amount % 1 ether == 0,
            "Transfer amount must be whole tokens (no decimals)"
        );
        return super.transfer(to, amount);
    }

    function _mint(
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20CappedUpgradeable) {
        // calls ERC20CappedUpgradeable in linearization order
        super._mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20Upgradeable, ERC20PausableUpgradeable) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
