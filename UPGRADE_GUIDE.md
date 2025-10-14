# OneP Contract Upgrade Guide

This guide explains how to upgrade the OneP contract using the provided upgrade scripts.

## 📋 Overview

The OneP contract uses OpenZeppelin's transparent proxy pattern, allowing for upgrades while preserving all contract state. The upgrade system includes:

- **Standard Upgrade**: Preserves all state and functionality
- **Advanced Upgrade**: Multiple strategies for different scenarios
- **Compatibility Checks**: Verify upgrade readiness
- **Rollback Capability**: Emergency rollback if needed

## 🚀 Quick Start

### 1. Check Upgrade Compatibility

Before upgrading, always check if the contract is ready for upgrade:

```bash
# Check compatibility on cc network
CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network cc

# Check compatibility on etherlink network
CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network etherlink
```

### 2. Perform Standard Upgrade

```bash
# Upgrade OneP contract on cc network
npx hardhat run scripts/upgrade-onep.ts --network cc

# Upgrade OneP contract on etherlink network
npx hardhat run scripts/upgrade-onep.ts --network etherlink
```

### 3. Advanced Upgrade Options

```bash
# Standard upgrade (preserves all state)
DRY_RUN=true UPGRADE_STRATEGY=standard npx hardhat run scripts/upgrade-onep-advanced.ts --network cc

# Upgrade with reinitialization
DRY_RUN=true UPGRADE_STRATEGY=init npx hardhat run scripts/upgrade-onep-advanced.ts --network cc

# Emergency upgrade
DRY_RUN=true UPGRADE_STRATEGY=emergency npx hardhat run scripts/upgrade-onep-advanced.ts --network cc
```

## 📊 Current Deployments

| Network   | OneP Address                                 | Implementation                               | Status    |
| --------- | -------------------------------------------- | -------------------------------------------- | --------- |
| cc        | `0x15868E3227F91E7457689022DeFd364037F4293C` | `0x9838B6aFBC0768d1e4B574677E28E01d4C7f5F94` | ✅ Active |
| etherlink | `0x74490cf620C2CEe6633082dC8F8D07C42FEe6aD3` | `0x99900EE81f6F94DA41721CBba8a2FBde9C95B4b6` | ✅ Active |

## 🔧 Upgrade Strategies

### Standard Upgrade

- **Purpose**: Regular contract upgrades with new features or bug fixes
- **State**: All existing state is preserved
- **Safety**: High - no data loss
- **Usage**: Most common upgrade scenario

### Upgrade with Initialization

- **Purpose**: When new state variables need initialization
- **State**: Preserves existing state, initializes new variables
- **Safety**: Medium - requires careful handling
- **Usage**: When adding new functionality that needs setup

### Emergency Upgrade

- **Purpose**: Critical bug fixes or security patches
- **State**: Preserves existing state
- **Safety**: High - designed for urgent situations
- **Usage**: Security vulnerabilities or critical bugs

### Rollback

- **Purpose**: Revert to previous implementation
- **State**: Preserves existing state
- **Safety**: High - but requires previous implementation address
- **Usage**: When new implementation has issues

## 🛠️ Scripts Available

### 1. `scripts/upgrade-onep.ts`

Basic upgrade script with standard functionality:

- Standard upgrade
- Compatibility check
- Hardhat-deploy integration

### 2. `scripts/upgrade-onep-advanced.ts`

Advanced upgrade script with multiple strategies:

- Standard upgrade
- Upgrade with initialization
- Emergency upgrade
- Rollback capability
- Dry run support

### 3. `deploy/1000_deploy_1p.ts`

Updated deployment script that:

- Checks for upgrade needs
- Provides upgrade guidance
- Maintains contract state

## 🔍 Environment Variables

| Variable             | Description                        | Example                     |
| -------------------- | ---------------------------------- | --------------------------- |
| `CHECK_ONLY`         | Only perform compatibility check   | `CHECK_ONLY=true`           |
| `DRY_RUN`            | Simulate upgrade without executing | `DRY_RUN=true`              |
| `UPGRADE_STRATEGY`   | Choose upgrade strategy            | `UPGRADE_STRATEGY=standard` |
| `USE_HARDHAT_DEPLOY` | Use hardhat-deploy upgrade method  | `USE_HARDHAT_DEPLOY=true`   |

## 📝 Usage Examples

### Check Contract Status

```bash
# Check all networks
CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network cc
CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network etherlink
```

### Dry Run Upgrade

```bash
# Test upgrade without executing
DRY_RUN=true npx hardhat run scripts/upgrade-onep-advanced.ts --network cc
```

### Perform Actual Upgrade

```bash
# Execute upgrade
npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Advanced Upgrade Scenarios

```bash
# Standard upgrade
UPGRADE_STRATEGY=standard npx hardhat run scripts/upgrade-onep-advanced.ts --network cc

# Upgrade with initialization
UPGRADE_STRATEGY=init npx hardhat run scripts/upgrade-onep-advanced.ts --network cc

# Emergency upgrade
UPGRADE_STRATEGY=emergency npx hardhat run scripts/upgrade-onep-advanced.ts --network cc
```

## ⚠️ Important Notes

### Before Upgrading

1. **Always run compatibility check first**
2. **Test on testnet before mainnet**
3. **Ensure you have admin privileges**
4. **Backup current implementation address**

### During Upgrade

1. **Monitor transaction status**
2. **Verify upgrade completion**
3. **Test contract functionality**
4. **Check all state variables**

### After Upgrade

1. **Verify contract state**
2. **Test all functions**
3. **Update documentation**
4. **Notify users if needed**

## 🔒 Security Considerations

- **Admin Access**: Only admin can perform upgrades
- **Proxy Pattern**: Uses OpenZeppelin's battle-tested proxy
- **State Preservation**: All existing state is maintained
- **Rollback Capability**: Can revert if issues arise

## 🐛 Troubleshooting

### Common Issues

1. **"No deployment found"**
   - Solution: Ensure contract is deployed on the target network

2. **"Already initialized"**
   - Solution: Use standard upgrade instead of init strategy

3. **"Upgrade failed"**
   - Solution: Check admin permissions and network connectivity

4. **"Contract not upgradeable"**
   - Solution: Verify proxy configuration

### Getting Help

If you encounter issues:

1. Check the error message carefully
2. Verify network and contract addresses
3. Ensure you have proper permissions
4. Try dry run first to identify issues

## 📚 Additional Resources

- [OpenZeppelin Upgrades Documentation](https://docs.openzeppelin.com/upgrades-plugins/1.x/)
- [Hardhat Deploy Documentation](https://github.com/wighawag/hardhat-deploy)
- [Proxy Pattern Guide](https://docs.openzeppelin.com/contracts/4.x/api/proxy)

---

**Remember**: Always test upgrades on testnets first and maintain proper backups!
