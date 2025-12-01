import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { UnrealT1, Burned } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("UnrealT1 and Burned Integration", function () {
  let unrealT1: UnrealT1;
  let unrealB: Burned;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  const INITIAL_SUPPLY = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy UnrealT1
    const UnrealT1Factory = await ethers.getContractFactory("UnrealT1");
    unrealT1 = (await upgrades.deployProxy(UnrealT1Factory, [INITIAL_SUPPLY], {
      initializer: "initialize",
    })) as unknown as UnrealT1;
    await unrealT1.waitForDeployment();

    // Deploy Burned
    const BurnedFactory = await ethers.getContractFactory("Burned");
    unrealB = (await upgrades.deployProxy(BurnedFactory, [], {
      initializer: "initialize",
    })) as unknown as Burned;
    await unrealB.waitForDeployment();

    // Setup relationship
    await unrealT1.setUnrealB(await unrealB.getAddress());
    await unrealB.setMinter(await unrealT1.getAddress());
  });

  it("Should have correct initial state", async function () {
    expect(await unrealT1.name()).to.equal("Unreal T1");
    expect(await unrealB.name()).to.equal("Unreal Burned");
    expect(await unrealT1.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
  });

  it("Should transfer normally via transfer()", async function () {
    const amount = ethers.parseEther("100");
    await unrealT1.transfer(user1.address, amount);
    expect(await unrealT1.balanceOf(user1.address)).to.equal(amount);
    expect(await unrealT1.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - amount);
  });

  it("Should burn T1 and mint B via transferFrom()", async function () {
    const amount = ethers.parseEther("50");
    
    // Setup: owner has tokens, user1 will "spend" them (via allowance) to pay user2
    // Actually, usually transferFrom is: spender (msg.sender) moves tokens from 'from' to 'to'.
    // Here: spender (user1) moves tokens from 'owner' to 'user2'?
    // Let's test the flow: User1 has tokens. User2 wants to pull payment.
    
    // Scenario: User1 has tokens. User1 approves User2. User2 calls transferFrom(User1, User2, amount).
    // Result: User1 burns T1. User2 gets B.
    
    await unrealT1.transfer(user1.address, amount);
    
    // User1 approves User2 to spend
    await unrealT1.connect(user1).approve(user2.address, amount);
    
    // Check balances before
    const t1SupplyBefore = await unrealT1.totalSupply();
    
    // User2 calls transferFrom
    await unrealT1.connect(user2).transferFrom(user1.address, user2.address, amount);
    
    // Checks
    // 1. User1 T1 balance should be 0 (burned)
    expect(await unrealT1.balanceOf(user1.address)).to.equal(0);
    
    // 2. User2 T1 balance should be 0 (didn't receive T1)
    expect(await unrealT1.balanceOf(user2.address)).to.equal(0);
    
    // 3. User2 B balance should be amount (minted)
    expect(await unrealB.balanceOf(user2.address)).to.equal(amount);
    
    // 4. T1 Total Supply should decrease
    expect(await unrealT1.totalSupply()).to.equal(t1SupplyBefore - amount);
  });

  it("Should fail if amount is not whole token for transfer()", async function () {
    const amount = ethers.parseEther("1.5");
    await expect(unrealT1.transfer(user1.address, amount)).to.be.revertedWith(
      "Transfer amount must be whole tokens (no decimals)"
    );
  });
  
  it("Should allow transferFrom even if amount is not whole token (no restriction in transferFrom)", async function () {
      // The restriction was only in transfer(), not transferFrom in the original code?
      // Checking code... yes, transfer() has the check. transferFrom() does not have it explicitly in the new code.
      // Let's verify.
      const amount = ethers.parseEther("1.5");
      await unrealT1.transfer(user1.address, ethers.parseEther("2"));
      await unrealT1.connect(user1).approve(user2.address, amount);
      
      await expect(unrealT1.connect(user2).transferFrom(user1.address, user2.address, amount)).to.not.be.reverted;
      expect(await unrealB.balanceOf(user2.address)).to.equal(amount);
  });
});
