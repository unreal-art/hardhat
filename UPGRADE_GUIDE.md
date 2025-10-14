# OneP Contract Upgrade Script - All-in-One

## 🎯 Overview

This single script handles all OneP contract upgrade needs with sensible defaults. No complex configuration needed!

## 🚀 Quick Start

### Basic Usage (Recommended)

```bash
# Check contract status
CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network cc

# Dry run upgrade (test without executing)
DRY_RUN=true npx hardhat run scripts/upgrade-onep.ts --network cc

# Perform actual upgrade
npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Advanced Usage

```bash
# Upgrade with reinitialization
STRATEGY=init npx hardhat run scripts/upgrade-onep.ts --network cc

# Emergency upgrade
STRATEGY=emergency npx hardhat run scripts/upgrade-onep.ts --network cc

# Custom proxy address
PROXY_ADDRESS=0x1234... ADMIN_ADDRESS=0x5678... npx hardhat run scripts/upgrade-onep.ts --network cc
```

## 📊 Known Deployments (Auto-detected)

| Network   | Proxy Address                                | Auto-detected |
| --------- | -------------------------------------------- | ------------- |
| cc        | `0x15868E3227F91E7457689022DeFd364037F4293C` | ✅ Yes        |
| etherlink | `0x74490cf620C2CEe6633082dC8F8D07C42FEe6aD3` | ✅ Yes        |

## 🔧 Environment Variables (All Optional)

| Variable        | Description                        | Default                  |
| --------------- | ---------------------------------- | ------------------------ |
| `PROXY_ADDRESS` | Proxy contract address             | Auto-detected by network |
| `ADMIN_ADDRESS` | Admin address                      | First account            |
| `DRY_RUN`       | Simulate upgrade without executing | `false`                  |
| `STRATEGY`      | Upgrade strategy                   | `standard`               |
| `CHECK_ONLY`    | Only check contract status         | `false`                  |

## 🎯 Upgrade Strategies

### Standard (Default)

- **Purpose**: Regular upgrades with new features or bug fixes
- **State**: All existing state is preserved
- **Safety**: High - no data loss
- **Usage**: Most common upgrade scenario

### Init

- **Purpose**: When new state variables need initialization
- **State**: Preserves existing state, initializes new variables
- **Safety**: Medium - requires careful handling
- **Usage**: When adding new functionality that needs setup

### Emergency

- **Purpose**: Critical bug fixes or security patches
- **State**: Preserves existing state
- **Safety**: High - designed for urgent situations
- **Usage**: Security vulnerabilities or critical bugs

## 🚀 Usage Examples

### Check Contract Status

```bash
CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Test Upgrade (Dry Run)

```bash
DRY_RUN=true npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Standard Upgrade

```bash
npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Upgrade with Initialization

```bash
STRATEGY=init npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Emergency Upgrade

```bash
STRATEGY=emergency npx hardhat run scripts/upgrade-onep.ts --network cc
```

### Custom Configuration

```bash
PROXY_ADDRESS=0x1234... ADMIN_ADDRESS=0x5678... STRATEGY=init DRY_RUN=true npx hardhat run scripts/upgrade-onep.ts --network cc
```

## ⚠️ Important Notes

### Before Upgrading

1. **Always run dry run first**: `DRY_RUN=true npx hardhat run scripts/upgrade-onep.ts --network <network>`
2. **Check contract status**: `CHECK_ONLY=true npx hardhat run scripts/upgrade-onep.ts --network <network>`
3. **Test on testnet before mainnet**
4. **Ensure you have admin privileges**

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

1. **"No proxy address found"**
   - Solution: Use a supported network (cc, etherlink) or set PROXY_ADDRESS

2. **"Contract may not be upgradeable"**
   - Solution: Verify proxy configuration

3. **"Upgrade failed"**
   - Solution: Check admin permissions and network connectivity

4. **"Already initialized"**
   - Solution: Use standard strategy instead of init

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
