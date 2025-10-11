import "@nomicfoundation/hardhat-toolbox";
import { task } from "hardhat/config";
import { MoneyPot } from "../typechain-types";
import { getAccount } from "../utils/accounts";

// Helper function to connect to MoneyPot contract
async function connectMoneyPot(hre: any) {
  const deployment = await hre.deployments.get("MoneyPot");
  console.log("MoneyPot deployment: ", deployment.address);
  const factory = await hre.ethers.getContractFactory("MoneyPot");
  const contract = factory.attach(deployment.address) as unknown as MoneyPot;
  return contract;
}

task("moneypot:create", "Create a new MoneyPot")
  .addOptionalPositionalParam(
    "amount",
    "Amount of USDC tokens to put in the pot",
    "1",
  )
  .addOptionalPositionalParam(
    "duration",
    "Duration in seconds for the pot to be active",
    "7200",
  )
  .addOptionalPositionalParam("fee", "Entry fee for attempting the pot", "0.1")
  .addOptionalPositionalParam(
    "oneFaAddress",
    "OneP address for the pot",
    "0xA24f89934F6B0119B63Df7310d102994B9B54980",
  )
  .setAction(
    async (
      {
        amount,
        duration,
        fee,
        oneFaAddress,
      }: {
        amount: string;
        duration: string;
        fee: string;
        oneFaAddress: string;
      },
      hre,
    ) => {
      console.log({ amount, duration, fee, oneFaAddress });
      // Validate inputs
      if (!amount || !duration || !fee || !oneFaAddress) {
        throw new Error("Amount, duration, fee, and oneFaAddress are required");
      }

      // Get the MoneyPot contract
      const moneyPot = await connectMoneyPot(hre);

      // Get the account to use
      const wallet = getAccount("admin");
      const signer = await hre.ethers.getSigner(wallet.address);

      // Parse amounts
      const amountWei = hre.ethers.parseUnits(amount, 6); // USDC has 6 decimals
      const feeWei = hre.ethers.parseUnits(fee, 6);
      const durationSeconds = parseInt(duration);

      // Check if user has enough tokens
      const balance = await moneyPot.balanceOf(wallet.address);

      console.log(`Account: ${wallet.address}`);
      console.log(`Amount: ${amount} USDC`);
      console.log(`Duration: ${durationSeconds} seconds`);
      console.log(`Entry Fee: ${fee} USDC`);
      console.log(`OneP Address: ${oneFaAddress}`);
      console.log(
        `Current Balance: ${hre.ethers.formatUnits(balance, 6)} USDC`,
      );

      if (balance < amountWei) {
        throw new Error(
          `Insufficient balance. Need ${amount} USDC, have ${hre.ethers.formatUnits(balance, 6)} USDC`,
        );
      }

      // Create the pot
      console.log(`\nCreating MoneyPot...`);
      const tx = await moneyPot
        .connect(signer)
        .createPot(amountWei, durationSeconds, feeWei, oneFaAddress);
      await tx.wait();

      console.log(`✅ Successfully created MoneyPot`);
      console.log(`Transaction hash: ${tx.hash}`);

      // Get the pot ID from the transaction receipt
      const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
      const potCreatedEvent = receipt?.logs.find((log) => {
        try {
          const parsed = moneyPot.interface.parseLog(log);
          return parsed?.name === "PotCreated";
        } catch {
          return false;
        }
      });

      if (potCreatedEvent) {
        const parsed = moneyPot.interface.parseLog(potCreatedEvent);
        const potId = parsed?.args[0];
        console.log(`Pot ID: ${potId}`);
      }
    },
  );

task("moneypot:attempt", "Attempt to solve a MoneyPot")
  .addPositionalParam("potId", "ID of the pot to attempt")
  .addOptionalParam(
    "account",
    "Account to use for the attempt (defaults to admin)",
    "admin",
  )
  .setAction(
    async ({ potId, account }: { potId: string; account?: string }, hre) => {
      // Get the MoneyPot contract
      const moneyPot = await connectMoneyPot(hre);

      // Get the account to use
      const wallet = getAccount(account || "admin");
      const signer = await hre.ethers.getSigner(wallet.address);

      const potIdNum = parseInt(potId);

      // Get pot details
      const pot = await moneyPot.getPot(potIdNum);

      if (!pot.isActive) {
        throw new Error(`Pot ${potId} is not active`);
      }

      if (Date.now() / 1000 >= Number(pot.expiresAt)) {
        throw new Error(`Pot ${potId} has expired`);
      }

      // Check if user has enough tokens for entry fee
      const balance = await moneyPot.balanceOf(wallet.address);

      console.log(`Account: ${wallet.address}`);
      console.log(`Pot ID: ${potId}`);
      console.log(`Entry Fee: ${hre.ethers.formatUnits(pot.fee, 6)} USDC`);
      console.log(
        `Current Balance: ${hre.ethers.formatUnits(balance, 6)} USDC`,
      );

      if (balance < pot.fee) {
        throw new Error(
          `Insufficient balance. Need ${hre.ethers.formatUnits(pot.fee, 6)} USDC, have ${hre.ethers.formatUnits(balance, 6)} USDC`,
        );
      }

      // Attempt the pot
      console.log(`\nAttempting MoneyPot ${potId}...`);
      const tx = await moneyPot.connect(signer).attemptPot(potIdNum);
      await tx.wait();

      console.log(`✅ Successfully attempted MoneyPot ${potId}`);
      console.log(`Transaction hash: ${tx.hash}`);

      // Get the attempt ID from the transaction receipt
      const receipt = await hre.ethers.provider.getTransactionReceipt(tx.hash);
      const potAttemptedEvent = receipt?.logs.find((log) => {
        try {
          const parsed = moneyPot.interface.parseLog(log);
          return parsed?.name === "PotAttempted";
        } catch {
          return false;
        }
      });

      if (potAttemptedEvent) {
        const parsed = moneyPot.interface.parseLog(potAttemptedEvent);
        const attemptId = parsed?.args[0];
        console.log(`Attempt ID: ${attemptId}`);
      }
    },
  );

task("moneypot:transfer", "Transfer MoneyPot tokens to an address")
  .addPositionalParam("to", "Address to transfer tokens to")
  .addPositionalParam("amount", "Amount of USDC tokens to transfer")
  .addOptionalParam(
    "account",
    "Account to use for the transfer (defaults to admin)",
    "admin",
  )
  .setAction(
    async (
      { to, amount, account }: { to: string; amount: string; account?: string },
      hre,
    ) => {
      // Validate inputs
      if (!to || !amount) {
        throw new Error("To address and amount are required");
      }

      // Get the MoneyPot contract
      const moneyPot = await connectMoneyPot(hre);

      // Get the account to use
      const wallet = getAccount(account || "admin");
      const signer = await hre.ethers.getSigner(wallet.address);

      // Parse amount
      const amountWei = hre.ethers.parseUnits(amount, 6); // USDC has 6 decimals

      // Check if user has enough tokens
      const balance = await moneyPot.balanceOf(wallet.address);

      console.log(`From: ${wallet.address}`);
      console.log(`To: ${to}`);
      console.log(`Amount: ${amount} USDC`);
      console.log(
        `Current Balance: ${hre.ethers.formatUnits(balance, 6)} USDC`,
      );

      if (balance < amountWei) {
        throw new Error(
          `Insufficient balance. Need ${amount} USDC, have ${hre.ethers.formatUnits(balance, 6)} USDC`,
        );
      }

      // Transfer tokens
      console.log(`\nTransferring ${amount} USDC to ${to}...`);
      const tx = await moneyPot.connect(signer).transfer(to, amountWei);
      await tx.wait();

      console.log(`✅ Successfully transferred ${amount} USDC to ${to}`);
      console.log(`Transaction hash: ${tx.hash}`);
    },
  );

task("moneypot:list", "List all MoneyPots").setAction(async ({}, hre) => {
  const moneyPot = await connectMoneyPot(hre);

  const potIds = await moneyPot.getPots();

  console.log(`\nMoneyPots (${potIds.length} total):`);
  if (potIds.length === 0) {
    console.log("No pots created yet.");
  } else {
    for (const potId of potIds) {
      const pot = await moneyPot.getPot(potId);
      const status = pot.isActive ? "Active" : "Inactive";
      const expiresAt = new Date(Number(pot.expiresAt) * 1000).toLocaleString();
      console.log(`\nPot ID: ${potId}`);
      console.log(`- Creator: ${pot.creator}`);
      console.log(
        `- Amount: ${hre.ethers.formatUnits(pot.totalAmount, 6)} USDC`,
      );
      console.log(`- Entry Fee: ${hre.ethers.formatUnits(pot.fee, 6)} USDC`);
      console.log(`- Status: ${status}`);
      console.log(`- Expires: ${expiresAt}`);
      console.log(`- Attempts: ${pot.attemptsCount}`);
      console.log(`- OneP Address: ${pot.oneFaAddress}`);
    }
  }
});

task("moneypot:active", "List active MoneyPots").setAction(async ({}, hre) => {
  const moneyPot = await connectMoneyPot(hre);

  const activePotIds = await moneyPot.getActivePots();

  console.log(`\nActive MoneyPots (${activePotIds.length} total):`);
  if (activePotIds.length === 0) {
    console.log("No active pots.");
  } else {
    for (const potId of activePotIds) {
      const pot = await moneyPot.getPot(potId);
      const expiresAt = new Date(Number(pot.expiresAt) * 1000).toLocaleString();
      console.log(`\nPot ID: ${potId}`);
      console.log(`- Creator: ${pot.creator}`);
      console.log(
        `- Amount: ${hre.ethers.formatUnits(pot.totalAmount, 6)} USDC`,
      );
      console.log(`- Entry Fee: ${hre.ethers.formatUnits(pot.fee, 6)} USDC`);
      console.log(`- Expires: ${expiresAt}`);
      console.log(`- Attempts: ${pot.attemptsCount}`);
      console.log(`- OneP Address: ${pot.oneFaAddress}`);
    }
  }
});

task("moneypot:details", "Get details of a specific MoneyPot")
  .addPositionalParam("potId", "ID of the pot to get details for")
  .setAction(async ({ potId }, hre) => {
    const moneyPot = await connectMoneyPot(hre);

    const potIdNum = parseInt(potId);
    const pot = await moneyPot.getPot(potIdNum);

    console.log(`\nMoneyPot Details (ID: ${potId}):`);
    console.log(`- Creator: ${pot.creator}`);
    console.log(`- Amount: ${hre.ethers.formatUnits(pot.totalAmount, 6)} USDC`);
    console.log(`- Entry Fee: ${hre.ethers.formatUnits(pot.fee, 6)} USDC`);
    console.log(
      `- Created: ${new Date(Number(pot.createdAt) * 1000).toLocaleString()}`,
    );
    console.log(
      `- Expires: ${new Date(Number(pot.expiresAt) * 1000).toLocaleString()}`,
    );
    console.log(`- Status: ${pot.isActive ? "Active" : "Inactive"}`);
    console.log(`- Attempts: ${pot.attemptsCount}`);
    console.log(`- OneP Address: ${pot.oneFaAddress}`);
  });

task("moneypot:balance", "Get MoneyPot token balance for an account")
  .addOptionalParam(
    "account",
    "Account to check balance for (defaults to admin)",
    "admin",
  )
  .setAction(async ({ account }, hre) => {
    const moneyPot = await connectMoneyPot(hre);

    const wallet = getAccount(account || "admin");
    const balance = await moneyPot.balanceOf(wallet.address);

    console.log(`\nAccount: ${wallet.address}`);
    console.log(`Balance: ${hre.ethers.formatUnits(balance, 6)} USDC`);
  });

task("moneypot:expire", "Expire a MoneyPot (only if it has expired)")
  .addPositionalParam("potId", "ID of the pot to expire")
  .addOptionalParam(
    "account",
    "Account to use for expiring (defaults to admin)",
    "admin",
  )
  .setAction(
    async ({ potId, account }: { potId: string; account?: string }, hre) => {
      const moneyPot = await connectMoneyPot(hre);

      const wallet = getAccount(account || "admin");
      const signer = await hre.ethers.getSigner(wallet.address);

      const potIdNum = parseInt(potId);

      // Get pot details first
      const pot = await moneyPot.getPot(potIdNum);

      console.log(`Account: ${wallet.address}`);
      console.log(`Pot ID: ${potId}`);
      console.log(`Current Status: ${pot.isActive ? "Active" : "Inactive"}`);
      console.log(
        `Expires At: ${new Date(Number(pot.expiresAt) * 1000).toLocaleString()}`,
      );
      console.log(`Current Time: ${new Date().toLocaleString()}`);

      if (!pot.isActive) {
        throw new Error(`Pot ${potId} is already inactive`);
      }

      if (Date.now() / 1000 < Number(pot.expiresAt)) {
        throw new Error(`Pot ${potId} has not expired yet`);
      }

      // Expire the pot
      console.log(`\nExpiring MoneyPot ${potId}...`);
      const tx = await moneyPot.connect(signer).expirePot(potIdNum);
      await tx.wait();

      console.log(`✅ Successfully expired MoneyPot ${potId}`);
      console.log(`Transaction hash: ${tx.hash}`);
    },
  );

task("moneypot:token", "Drip MoneyPot tokens to an account")
  .addPositionalParam("account", "The address or privateKey to drip to")
  .addPositionalParam("amount", "The amount to drip", "0")
  .addOptionalPositionalParam("eth", "The eth to drip", "0")
  .setAction(async ({ amount, account, eth }, hre) => {
    const tokenContract = await connectMoneyPot(hre);
    await hre.run("drip", {
      account,
      eth,
      amt: amount,
      tokenAddress: await tokenContract.getAddress(),
    });
  });
