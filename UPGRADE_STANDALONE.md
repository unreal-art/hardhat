# OneP Contract Upgrade Scripts - Standalone Version

## 🎯 Overview

These scripts provide standalone upgrade functionality for OneP contracts without requiring deployment files. They work by directly interacting with the blockchain using contract addresses.

## 📁 Available Scripts

### 1. `scripts/upgrade-onep-simple.ts` - Simple Upgrade Script

**Features:**

- Basic contract upgrade functionality
- Environment variable configuration
- Dry run support
- Verification after upgrade

**Usage:**

```bash
# Basic upgrade
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> npx hardhat run scripts/upgrade-onep-simple.ts --network cc

# Dry run
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> DRY_RUN=true npx hardhat run scripts/upgrade-onep-simple.ts --network cc
```

### 2. `scripts/upgrade-onep-standalone.ts` - Advanced Standalone Script

**Features:**

- Multiple upgrade strategies
- Status checking
- Known deployments reference
- Comprehensive error handling

**Usage:**

```bash
# Show known deployments
npx hardhat run scripts/upgrade-onep-standalone.ts --network cc

# Check status
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C CHECK_STATUS=true npx hardhat run scripts/upgrade-onep-standalone.ts --network cc

# Standard upgrade
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> npx hardhat run scripts/upgrade-onep-standalone.ts --network cc

# Advanced upgrade with strategy
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> STRATEGY=init npx hardhat run scripts/upgrade-onep-standalone.ts --network cc
```

## 📊 Known Deployments

| Network   | Proxy Address                                | Implementation                               |
| --------- | -------------------------------------------- | -------------------------------------------- |
| cc        | `0x15868E3227F91E7457689022DeFd364037F4293C` | `0x9838B6aFBC0768d1e4B574677E28E01d4C7f5F94` |
| etherlink | `0x74490cf620C2CEe6633082dC8F8D07C42FEe6aD3` | `0x99900EE81f6F94DA41721CBba8a2FBde9C95B4b6` |

## 🔧 Environment Variables

| Variable        | Description                        | Example                                      |
| --------------- | ---------------------------------- | -------------------------------------------- |
| `PROXY_ADDRESS` | Proxy contract address             | `0x15868E3227F91E7457689022DeFd364037F4293C` |
| `ADMIN_ADDRESS` | Admin address                      | `<your-admin-address>`                       |
| `DRY_RUN`       | Simulate upgrade without executing | `true`                                       |
| `STRATEGY`      | Upgrade strategy                   | `standard`, `init`, `emergency`              |
| `CHECK_STATUS`  | Only check contract status         | `true`                                       |

## 🚀 Quick Examples

### Check Contract Status

```bash
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C CHECK_STATUS=true npx hardhat run scripts/upgrade-onep-standalone.ts --network cc
```

### Dry Run Upgrade

```bash
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> DRY_RUN=true npx hardhat run scripts/upgrade-onep-simple.ts --network cc
```

### Perform Actual Upgrade

```bash
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> npx hardhat run scripts/upgrade-onep-simple.ts --network cc
```

### Advanced Upgrade with Initialization

```bash
PROXY_ADDRESS=0x15868E3227F91E7457689022DeFd364037F4293C ADMIN_ADDRESS=<admin> STRATEGY=init npx hardhat run scripts/upgrade-onep-standalone.ts --network cc
```

## ⚠️ Important Notes

1. **Admin Access**: Only the admin can perform upgrades
2. **State Preservation**: All existing contract state is maintained
3. **Network Compatibility**: Scripts work with any EVM-compatible network
4. **No Deployment Files**: Scripts work standalone without hardhat-deploy

## 🔒 Security Considerations

- Always test upgrades on testnets first
- Verify admin permissions before upgrading
- Keep backups of implementation addresses
- Monitor upgrade transactions carefully

## 🐛 Troubleshooting

### Common Issues

1. **"PROXY_ADDRESS required"**
   - Solution: Set the PROXY_ADDRESS environment variable

2. **"ADMIN_ADDRESS required"**
   - Solution: Set the ADMIN_ADDRESS environment variable

3. **"Upgrade failed"**
   - Solution: Check admin permissions and network connectivity

4. **"Contract may not be upgradeable"**
   - Solution: Verify proxy configuration

### Getting Help

If you encounter issues:

1. Check the error message carefully
2. Verify contract addresses are correct
3. Ensure you have proper admin permissions
4. Try dry run first to identify issues

---

**Remember**: Always test upgrades on testnets first and maintain proper backups!
