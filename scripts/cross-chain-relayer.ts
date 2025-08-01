import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as nearAPI from "near-api-js";
import type { Contract, Account } from "near-api-js";

interface EtherlinkConfig {
  rpc: string;
  htlcContractAddress: string;
  pollingInterval: number;
}

interface NearConfig {
  networkId: string;
  nodeUrl: string;
  contractName: string;
  walletUrl: string;
  helperUrl: string;
}

interface RelayerConfig {
  ethPrivateKey: string;
  nearAccountId: string;
  nearPrivateKey: string;
}

interface Config {
  etherlink: EtherlinkConfig;
  near: NearConfig;
  relayer: RelayerConfig;
}

interface ProcessedEvents {
  [key: string]: number;
}

interface NearHTLCContract extends Contract {
  get_lock_contract: (args: { lock_contract_id: string }) => Promise<any>;
  has_lock_contract: (args: { lock_contract_id: string }) => Promise<boolean>;
  complete_swap: (args: {
    source_chain: string;
    source_address: string;
    destination: string;
    amount: string;
    preimage: string;
  }) => Promise<boolean>;
}

// Configuration for the relayer
const config: Config = {
  etherlink: {
    rpc: 'http://127.0.0.1:8545',
    htlcContractAddress: '', // To be filled in after deployment
    pollingInterval: 5000, // Poll every 5 seconds
  },
  near: {
    networkId: 'testnet', // or 'mainnet'
    nodeUrl: 'https://rpc.testnet.near.org',
    contractName: '', // To be filled in after deployment
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
  },
  relayer: {
    ethPrivateKey: '', // To be filled in before running
    nearAccountId: '', // To be filled in before running
    nearPrivateKey: '', // To be filled in before running
  }
};

// ABI for the Etherlink HTLC contract
const HTLC_ABI = [
  "event SwapInitiated(bytes32 indexed lockContractId, bytes32 secretHash, address indexed recipient, address indexed sender, uint256 amount, uint256 endtime, string targetChain, string targetAddress)",
  "event SwapWithdrawn(bytes32 indexed lockContractId, string preimage)",
  "event SwapRefunded(bytes32 indexed lockContractId)",
  "event CrossChainSwapCompleted(bytes32 lockContractId, string sourceChain, string sourceAddress, address destinationAddress, uint256 amount, string preimage)",
  "function completeSwap(string calldata sourceChain, string calldata sourceAddress, address destinationAddress, uint256 amount, string calldata preimage)"
];

// Database to keep track of processed events (simple JSON file for the demo)
const DB_PATH = path.join(__dirname, '../.states/processed-events.json');
let processedEvents: ProcessedEvents = {};

// Load processed events from disk
function loadProcessedEvents(): void {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      processedEvents = JSON.parse(data);
      console.log('Loaded processed events:', Object.keys(processedEvents).length);
    } else {
      console.log('No processed events found, starting fresh');
      processedEvents = {};
      // Create directory if it doesn't exist
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      saveProcessedEvents();
    }
  } catch (error) {
    console.error('Error loading processed events:', error);
    processedEvents = {};
  }
}

// Save processed events to disk
function saveProcessedEvents(): void {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(processedEvents, null, 2));
  } catch (error) {
    console.error('Error saving processed events:', error);
  }
}

// Check if an event has been processed
function isEventProcessed(eventId: string): boolean {
  return !!processedEvents[eventId];
}

// Mark an event as processed
function markEventProcessed(eventId: string): void {
  processedEvents[eventId] = Date.now();
  saveProcessedEvents();
}

interface EtherlinkClient {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;
  htlcContract: ethers.Contract;
}

// Initialize Etherlink provider and contract
async function initEtherlinkClient(): Promise<EtherlinkClient> {
  const provider = new ethers.providers.JsonRpcProvider(config.etherlink.rpc);
  const wallet = new ethers.Wallet(config.relayer.ethPrivateKey, provider);
  const htlcContract = new ethers.Contract(
    config.etherlink.htlcContractAddress,
    HTLC_ABI,
    wallet
  );
  
  console.log('Etherlink client initialized');
  console.log('Wallet address:', wallet.address);
  
  return { provider, wallet, htlcContract };
}

interface NearClient {
  nearConnection: nearAPI.Near;
  account: Account;
  htlcContract: NearHTLCContract;
}

// Initialize NEAR client
async function initNearClient(): Promise<NearClient> {
  const { connect, keyStores, KeyPair } = nearAPI;
  
  // Setup key store
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(config.relayer.nearPrivateKey);
  await keyStore.setKey(config.near.networkId, config.relayer.nearAccountId, keyPair);
  
  // Connect to NEAR
  const nearConnection = await connect({
    networkId: config.near.networkId,
    nodeUrl: config.near.nodeUrl,
    walletUrl: config.near.walletUrl,
    helperUrl: config.near.helperUrl,
    keyStore,
  });
  
  // Create account and contract instance
  const account = await nearConnection.account(config.relayer.nearAccountId);
  
  // Define contract methods we'll be using
  const htlcContract = new nearAPI.Contract(
    account,
    config.near.contractName,
    {
      viewMethods: ['get_lock_contract', 'has_lock_contract'],
      changeMethods: ['complete_swap'],
    }
  ) as NearHTLCContract;
  
  console.log('NEAR client initialized');
  
  return { nearConnection, account, htlcContract };
}

// Listen for SwapInitiated events on Etherlink
async function listenForEtherlinkSwaps(etherlink: EtherlinkClient, near: NearClient): Promise<void> {
  console.log('Starting to listen for Etherlink SwapInitiated events...');
  
  // Event filter for SwapInitiated
  const filter = etherlink.htlcContract.filters.SwapInitiated();
  
  // Polling for events
  const pollEvents = async (): Promise<void> => {
    try {
      // Get the latest block number
      const latestBlock = await etherlink.provider.getBlockNumber();
      
      // Look back 100 blocks
      const fromBlock = Math.max(0, latestBlock - 100);
      
      // Get events
      const events = await etherlink.htlcContract.queryFilter(filter, fromBlock);
      
      // Process new events
      for (const event of events) {
        const eventId = `etherlink-swapInitiated-${event.transactionHash}-${event.logIndex}`;
        
        // Skip if already processed
        if (isEventProcessed(eventId)) {
          continue;
        }
        
        console.log(`New SwapInitiated event detected: ${eventId}`);
        
        // Extract event data
        const { lockContractId, secretHash, recipient, sender, amount, endtime, targetChain, targetAddress } = event.args!;
        
        // For NEAR swaps, relay to NEAR blockchain
        if (targetChain.toLowerCase() === 'near') {
          try {
            console.log(`Relaying to NEAR: from=${sender}, to=${targetAddress}, amount=${amount.toString()}`);
            
            // In a real implementation, we would call the NEAR contract to initiate a swap
            // await near.htlcContract.initiate_swap({
            //   secret_hash: secretHash,
            //   recipient: targetAddress,
            //   amount: amount.toString(),
            //   timeout_hours: 48, // Hardcoded for demo
            //   target_chain: 'etherlink',
            //   target_address: recipient
            // });
            
            console.log('Successfully relayed to NEAR');
          } catch (error) {
            console.error('Error relaying to NEAR:', error);
            continue; // Skip marking as processed if it failed
          }
        }
        
        // Mark event as processed
        markEventProcessed(eventId);
      }
    } catch (error) {
      console.error('Error polling Etherlink events:', error);
    }
    
    // Schedule next poll
    setTimeout(pollEvents, config.etherlink.pollingInterval);
  };
  
  // Start polling
  pollEvents();
}

// Listen for SwapWithdrawn events on Etherlink to get preimages
async function listenForEtherlinkWithdrawals(etherlink: EtherlinkClient, near: NearClient): Promise<void> {
  console.log('Starting to listen for Etherlink SwapWithdrawn events...');
  
  // Event filter for SwapWithdrawn
  const filter = etherlink.htlcContract.filters.SwapWithdrawn();
  
  // Polling for events
  const pollEvents = async (): Promise<void> => {
    try {
      // Get the latest block number
      const latestBlock = await etherlink.provider.getBlockNumber();
      
      // Look back 100 blocks
      const fromBlock = Math.max(0, latestBlock - 100);
      
      // Get events
      const events = await etherlink.htlcContract.queryFilter(filter, fromBlock);
      
      // Process new events
      for (const event of events) {
        const eventId = `etherlink-swapWithdrawn-${event.transactionHash}-${event.logIndex}`;
        
        // Skip if already processed
        if (isEventProcessed(eventId)) {
          continue;
        }
        
        console.log(`New SwapWithdrawn event detected: ${eventId}`);
        
        // Extract event data
        const { lockContractId, preimage } = event.args!;
        
        // Here we would look up the original lock contract to get details about the swap
        // For demo purposes, we'll just log it
        console.log(`Preimage revealed: ${preimage} for lock contract: ${lockContractId}`);
        
        // Mark event as processed
        markEventProcessed(eventId);
      }
    } catch (error) {
      console.error('Error polling Etherlink withdrawal events:', error);
    }
    
    // Schedule next poll
    setTimeout(pollEvents, config.etherlink.pollingInterval);
  };
  
  // Start polling
  pollEvents();
}

// Process NEAR events for cross-chain functionality
async function processNearEvents(etherlink: EtherlinkClient, near: NearClient): Promise<void> {
  console.log('Setting up NEAR event processing...');
  
  // In a production environment, we would listen to NEAR events via RPC
  // For the hackathon demo, we'll periodically check for NEAR contract state changes
  
  // This is a simplified polling mechanism - in production, use NEAR indexer or lake framework
  const pollNearEvents = async (): Promise<void> => {
    try {
      // Here we would query the NEAR contract for recent events or state changes
      // For now, this is a placeholder
      console.log('Checking for NEAR events...');
      
      // In a real implementation we would:
      // 1. Query for recent blocks with events from our contract
      // 2. Process those events
      // 3. For withdrawals, extract preimages and relay to Etherlink
      // 4. For new swaps, relay to Etherlink
    } catch (error) {
      console.error('Error processing NEAR events:', error);
    }
    
    // Schedule next poll
    setTimeout(pollNearEvents, config.etherlink.pollingInterval);
  };
  
  // Start polling
  pollNearEvents();
}

// Main function
async function main(): Promise<void> {
  console.log('Starting cross-chain relayer...');
  
  // Load processed events
  loadProcessedEvents();
  
  try {
    // Initialize clients
    const etherlink = await initEtherlinkClient();
    const near = await initNearClient();
    
    // Start listening for events
    await listenForEtherlinkSwaps(etherlink, near);
    await listenForEtherlinkWithdrawals(etherlink, near);
    await processNearEvents(etherlink, near);
    
    console.log('Relayer is running. Press Ctrl+C to stop.');
  } catch (error) {
    console.error('Error starting relayer:', error);
    process.exit(1);
  }
}

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

export { main };
