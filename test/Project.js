import { expect } from "chai";
import hardhat from "hardhat";
const { ethers } = hardhat;
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("TokenizedDeposit", function () {
  let compliance, interestManager, bridge, interestGovernance, txGovernance, token;
  let admin, bank, user1, user2;

  beforeEach(async function () {
    [admin, bank, user1, user2] = await ethers.getSigners();

    // Deploy Compliance
    const Compliance = await ethers.getContractFactory("Compliance");
    compliance = await Compliance.deploy();

    // Deploy InterestManager with 5% base rate (500 bps)
    const InterestManager = await ethers.getContractFactory("InterestManager");
    interestManager = await InterestManager.deploy(500);

    // Deploy CrossChainBridge
    const Bridge = await ethers.getContractFactory("CrossChainBridge");
    bridge = await Bridge.deploy();

    // Deploy InterestRateGovernance
    const InterestGov = await ethers.getContractFactory("InterestRateGovernance");
    const interestGovernance = await InterestGov.deploy(await interestManager.getAddress());

    // Deploy TransactionValidationGovernance
    const TxGov = await ethers.getContractFactory("TransactionValidationGovernance");
    txGovernance = await TxGov.deploy();

    // Deploy TokenizedDeposit
    const Token = await ethers.getContractFactory("TokenizedDeposit");
    token = await Token.deploy(
      await compliance.getAddress(),
      await interestManager.getAddress(),
      await bridge.getAddress(),
      await interestGovernance.getAddress(),
      await txGovernance.getAddress()
    );

    // Setup Roles
    const COMPLIANCE_ROLE = await compliance.COMPLIANCE_ROLE();
    await compliance.grantRole(COMPLIANCE_ROLE, admin.address);
    await compliance.grantRole(COMPLIANCE_ROLE, await token.getAddress());

    const TIMESTAMP_UPDATER_ROLE = await interestManager.TIMESTAMP_UPDATER_ROLE();
    await interestManager.grantRole(TIMESTAMP_UPDATER_ROLE, await token.getAddress());

    const RATE_UPDATER_ROLE = await interestManager.RATE_UPDATER_ROLE();
    await interestManager.grantRole(RATE_UPDATER_ROLE, await interestGovernance.getAddress());

    const GOV_PROXY_ROLE = await interestGovernance.GOVERNANCE_PROXY_ROLE();
    await interestGovernance.grantRole(GOV_PROXY_ROLE, await token.getAddress());
    await txGovernance.grantRole(GOV_PROXY_ROLE, await token.getAddress());

    const VALIDATOR_ROLE = await interestGovernance.VALIDATOR_ROLE();
    await interestGovernance.grantRole(VALIDATOR_ROLE, admin.address);
    await txGovernance.grantRole(VALIDATOR_ROLE, admin.address);

    // Add a bank (also triggers _recalculateAdminShare → admin gets 10%)
    await token.addBank(bank.address, ethers.parseEther("1000000"), true);

    // Admin needs BANK_ROLE to claim fee dividends
    const BANK_ROLE = await token.BANK_ROLE();
    await token.grantRole(BANK_ROLE, admin.address);
  });

  it("Should successfully add a bank validator", async function () {
    const BANK_ROLE = await token.BANK_ROLE();
    expect(await token.hasRole(BANK_ROLE, bank.address)).to.be.true;
    
    const bankInfo = await token.banks(bank.address);
    expect(bankInfo.isFounder).to.be.true;
    expect(bankInfo.initialContribution).to.equal(ethers.parseEther("1000000"));
  });

  it("Should whitelist a user successfully", async function () {
    await compliance.whitelistUser(user1.address);
    expect(await compliance.isWhitelisted(user1.address)).to.be.true;
  });

  it("Should issue deposits and accrue interest correctly", async function () {
    await token.connect(bank).issueDeposit(user1.address, ethers.parseEther("100000"));
    expect(await token.balanceOf(user1.address)).to.equal(ethers.parseEther("100000"));

    // Fast forward 1 year
    await time.increase(365 * 24 * 60 * 60);

    await token.connect(bank).accrueInterest(user1.address);

    // 100,000 balance -> margin is 30 bps. Net rate = 500 - 30 = 470 bps (4.7%)
    // Expected Interest = 100,000 * 4.7% = 4,700 tokens
    const expectedInterest = ethers.parseEther("4700");
    const expectedTotal = ethers.parseEther("104700");
    
    // Allow slight variance due to block timestamp precision differences
    const balance = await token.balanceOf(user1.address);
    expect(balance).to.be.closeTo(expectedTotal, ethers.parseEther("1"));
  });

  it("Should handle fee distribution and claiming correctly", async function () {
    await compliance.whitelistUser(bank.address);
    await compliance.whitelistUser(user2.address);

    await token.connect(bank).issueDeposit(user1.address, ethers.parseEther("10000"));

    // User 1 transfers to User 2 (generates protocol fee)
    await token.connect(user1).swapTokens(user2.address, ethers.parseEther("5000"));

    // swapTokens tiered fee: 25 bps of 5,000 = 12.5 tokens
    // Bank receives 90% of distributed fees (admin holds 10% of total shares)
    const totalFee = ethers.parseEther("12.5");
    const bankFeeExpected = totalFee * 9n / 10n;
    const receivedAmount = ethers.parseEther("4987.5"); // 5000 - 12.5
    
    expect(await token.balanceOf(user2.address)).to.equal(receivedAmount);

    // Bank claims dividend fees
    await token.connect(bank).claimFees();
    
    // Bank receives ~90% of fees proportional to their share
    expect(await token.balanceOf(bank.address)).to.be.closeTo(bankFeeExpected, 10n);
  });
});
