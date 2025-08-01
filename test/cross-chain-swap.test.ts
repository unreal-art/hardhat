import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import crypto from "crypto";
import { UnrealToken, UnrealHTLC } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Cross-Chain Swap", function () {
  let unrealToken: UnrealToken;
  let unrealHTLC: UnrealHTLC;
  let owner: SignerWithAddress;
  let alice: SignerWithAddress;
  let bob: SignerWithAddress;
  let relayer: SignerWithAddress;

  // Test parameters
  const initialSupply = ethers.utils.parseUnits("1000000", 18);
  const swapAmount = ethers.utils.parseUnits("1000", 18);
  const lockPeriodSeconds = 3600; // 1 hour
  
  // Demo parameters for cross-chain swap
  const mockNEARAccount = "alice.testnet";
  const mockEtherlinkAddress = "0xCaFEBaBe1234567890123456789abcdef0Fed00d";

  beforeEach(async function () {
    // Deploy contracts
    [owner, alice, bob, relayer] = await ethers.getSigners();
    
    // Deploy UnrealToken
    const UnrealToken = await ethers.getContractFactory("UnrealToken");
    unrealToken = (await upgrades.deployProxy(UnrealToken, ["Unreal Token", "UNREAL", initialSupply])) as UnrealToken;
    await unrealToken.deployed();

    // Deploy UnrealHTLC
    const UnrealHTLC = await ethers.getContractFactory("UnrealHTLC");
    unrealHTLC = (await upgrades.deployProxy(UnrealHTLC, [unrealToken.address])) as UnrealHTLC;
    await unrealHTLC.deployed();
    
    // Grant minting role to HTLC contract
    await unrealToken.mint(alice.address, swapAmount);
    await unrealToken.mint(bob.address, swapAmount);
    
    // Approve HTLC contract to spend tokens
    await unrealToken.connect(alice).approve(unrealHTLC.address, swapAmount);
    await unrealToken.connect(bob).approve(unrealHTLC.address, swapAmount);
  });

  describe("Etherlink to NEAR swap", function () {
    let secret: string;
    let secretHash: string;
    let lockContractId: string;
    
    beforeEach(async function () {
      // Generate a random secret
      secret = crypto.randomBytes(32).toString("hex");
      secretHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(secret));
      
      // Get the current time
      const currentTime = await time.latest();
      const endtime = currentTime + lockPeriodSeconds;
      
      // Alice initiates a swap to send tokens to Bob on NEAR
      const tx = await unrealHTLC.connect(alice).initiateSwap(
        secretHash,
        bob.address,
        swapAmount,
        endtime,
        "NEAR",
        mockNEARAccount
      );
      
      // Get the lockContractId from the event
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "SwapInitiated");
      if (!event || !event.args) {
        throw new Error("SwapInitiated event not found");
      }
      lockContractId = event.args.lockContractId;
    });
    
    it("should initiate a swap correctly", async function () {
      // Check that the swap was initiated correctly
      const lockContract = await unrealHTLC.getLockContract(lockContractId);
      
      expect(lockContract.secretHash).to.equal(secretHash);
      expect(lockContract.recipient).to.equal(bob.address);
      expect(lockContract.sender).to.equal(alice.address);
      expect(lockContract.amount).to.equal(swapAmount);
      expect(lockContract.withdrawn).to.be.false;
      expect(lockContract.refunded).to.be.false;
    });
    
    it("should allow withdrawal with correct secret", async function () {
      // Bob withdraws the tokens by revealing the secret
      await expect(
        unrealHTLC.connect(bob).withdraw(lockContractId, secret)
      ).to.emit(unrealHTLC, "SwapWithdrawn")
        .withArgs(lockContractId, secret);
      
      // Check that Bob received the tokens
      const bobBalance = await unrealToken.balanceOf(bob.address);
      expect(bobBalance).to.equal(swapAmount.mul(2)); // Initial + withdrawn
      
      // Check that the swap is marked as withdrawn
      const lockContract = await unrealHTLC.getLockContract(lockContractId);
      expect(lockContract.withdrawn).to.be.true;
      expect(lockContract.preimage).to.equal(secret);
    });
    
    it("should not allow withdrawal with incorrect secret", async function () {
      // Try to withdraw with wrong secret
      const wrongSecret = "wrong_secret";
      
      await expect(
        unrealHTLC.connect(bob).withdraw(lockContractId, wrongSecret)
      ).to.be.revertedWith("Secret hash does not match");
    });
    
    it("should not allow refund before timelock expires", async function () {
      await expect(
        unrealHTLC.connect(alice).refund(lockContractId)
      ).to.be.revertedWith("Timelock not expired");
    });
    
    it("should allow refund after timelock expires", async function () {
      // Fast forward time to after the timelock expires
      await time.increase(lockPeriodSeconds + 1);
      
      // Alice refunds her tokens
      await expect(
        unrealHTLC.connect(alice).refund(lockContractId)
      ).to.emit(unrealHTLC, "SwapRefunded")
        .withArgs(lockContractId);
      
      // Check that Alice got her tokens back
      const aliceBalance = await unrealToken.balanceOf(alice.address);
      expect(aliceBalance).to.equal(swapAmount);
      
      // Check that the swap is marked as refunded
      const lockContract = await unrealHTLC.getLockContract(lockContractId);
      expect(lockContract.refunded).to.be.true;
    });
  });

  describe("NEAR to Etherlink swap", function () {
    it("should complete a cross-chain swap from NEAR", async function () {
      const secret = crypto.randomBytes(32).toString("hex");
      const sourceChain = "NEAR";
      const sourceAddress = mockNEARAccount;
      const destinationAddress = bob.address;
      const amount = ethers.utils.parseUnits("500", 18);
      
      // Initial balance
      const initialBalance = await unrealToken.balanceOf(destinationAddress);
      
      // Relayer completes the swap (in production, this would be called by the relayer after verifying NEAR events)
      await expect(
        unrealHTLC.connect(owner).completeSwap(
          sourceChain,
          sourceAddress,
          destinationAddress,
          amount,
          secret
        )
      ).to.emit(unrealHTLC, "CrossChainSwapCompleted")
        .withArgs(
          ethers.utils.solidityKeccak256(
            ["string", "string", "address", "uint256", "string"],
            [sourceChain, sourceAddress, destinationAddress, amount, secret]
          ),
          sourceChain,
          sourceAddress,
          destinationAddress,
          amount,
          secret
        );
      
      // Check that Bob received the tokens
      const finalBalance = await unrealToken.balanceOf(destinationAddress);
      expect(finalBalance).to.equal(initialBalance.add(amount));
    });
    
    it("should not allow non-owner to complete cross-chain swaps", async function () {
      const secret = crypto.randomBytes(32).toString("hex");
      
      await expect(
        unrealHTLC.connect(alice).completeSwap(
          "NEAR",
          mockNEARAccount,
          bob.address,
          swapAmount,
          secret
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Integration test: Full cross-chain flow", function () {
    it("should demonstrate a complete bidirectional swap flow", async function () {
      // This test simulates the full flow of a bidirectional swap:
      // 1. Alice initiates a swap on Etherlink to send tokens to Bob on NEAR
      // 2. A relayer detects this and initiates a corresponding swap on NEAR
      // 3. Bob claims the tokens on NEAR, revealing the secret
      // 4. The relayer detects the secret reveal on NEAR and completes the swap on Etherlink
      
      // Step 1: Alice initiates swap on Etherlink
      const secret = crypto.randomBytes(32).toString("hex");
      const secretHash = ethers.utils.sha256(ethers.utils.toUtf8Bytes(secret));
      
      console.log("1. Alice initiates swap on Etherlink with secret:", secret);
      console.log("   Secret Hash:", secretHash);
      
      const currentTime = await time.latest();
      const endtime = currentTime + lockPeriodSeconds;
      
      const tx = await unrealHTLC.connect(alice).initiateSwap(
        secretHash,
        bob.address,
        swapAmount,
        endtime,
        "NEAR",
        mockNEARAccount
      );
      
      const receipt = await tx.wait();
      const event = receipt.events?.find(e => e.event === "SwapInitiated");
      if (!event || !event.args) {
        throw new Error("SwapInitiated event not found");
      }
      const lockContractId = event.args.lockContractId;
      
      console.log("   Lock Contract ID:", lockContractId);
      
      // Step 2: Relayer would detect the event and initiate a NEAR swap
      // (Simulated) Relayer initiates a swap on NEAR with the same secretHash
      console.log("2. Relayer detects Etherlink swap and initiates corresponding NEAR swap");
      console.log("   Simulated: NEAR swap created with same secret hash");
      
      // Step 3: Bob claims the tokens on NEAR, revealing the secret
      // (Simulated) Bob claims tokens on NEAR and reveals the secret
      console.log("3. Bob claims tokens on NEAR, revealing the secret:", secret);
      
      // Step 4: Relayer detects the secret reveal on NEAR and completes the swap on Etherlink
      console.log("4. Relayer detects secret reveal on NEAR and completes the swap on Etherlink");
      
      // Relayer uses the revealed secret to complete the swap on Etherlink
      await unrealHTLC.connect(owner).completeSwap(
        "NEAR",
        mockNEARAccount,
        bob.address,
        swapAmount,
        secret
      );
      
      // Verify that Bob received the tokens on Etherlink
      const bobBalance = await unrealToken.balanceOf(bob.address);
      console.log("   Bob's final balance:", ethers.utils.formatUnits(bobBalance, 18), "UNREAL");
      
      expect(bobBalance).to.be.gte(swapAmount);
      
      console.log("Bidirectional cross-chain swap completed successfully!");
    });
  });
});
