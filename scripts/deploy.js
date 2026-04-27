import hardhat from "hardhat";
const { ethers } = hardhat;

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Compliance
  const Compliance = await ethers.getContractFactory("Compliance");
  const compliance = await Compliance.deploy();
  await compliance.waitForDeployment();
  console.log("Compliance deployed to:", await compliance.getAddress());

  // Deploy InterestManager (e.g., 5% base rate)
  const InterestManager = await ethers.getContractFactory("InterestManager");
  const interestManager = await InterestManager.deploy(500);
  await interestManager.waitForDeployment();
  console.log("InterestManager deployed to:", await interestManager.getAddress());

  // Deploy CrossChainBridge
  const Bridge = await ethers.getContractFactory("CrossChainBridge");
  const bridge = await Bridge.deploy();
  await bridge.waitForDeployment();
  console.log("CrossChainBridge deployed to:", await bridge.getAddress());

  // Deploy InterestRateGovernance
  const InterestGov = await ethers.getContractFactory("InterestRateGovernance");
  const interestGovernance = await InterestGov.deploy();
  await interestGovernance.waitForDeployment();
  console.log("InterestRateGovernance deployed to:", await interestGovernance.getAddress());

  // Deploy TransactionValidationGovernance
  const TxGov = await ethers.getContractFactory("TransactionValidationGovernance");
  const txGovernance = await TxGov.deploy();
  await txGovernance.waitForDeployment();
  console.log("TransactionValidationGovernance deployed to:", await txGovernance.getAddress());

  // Deploy TokenizedDeposit
  const Token = await ethers.getContractFactory("TokenizedDeposit");
  const token = await Token.deploy(
    await compliance.getAddress(),
    await interestManager.getAddress(),
    await bridge.getAddress(),
    await interestGovernance.getAddress(),
    await txGovernance.getAddress()
  );
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("TokenizedDeposit deployed to:", tokenAddress);

  // Setup initial roles and permissions (Admin doing setup)
  const TIMESTAMP_UPDATER_ROLE = await interestManager.TIMESTAMP_UPDATER_ROLE();
  await interestManager.grantRole(TIMESTAMP_UPDATER_ROLE, tokenAddress);

  const GOV_PROXY_ROLE = await interestGovernance.GOVERNANCE_PROXY_ROLE();
  await interestGovernance.grantRole(GOV_PROXY_ROLE, tokenAddress);
  await txGovernance.grantRole(GOV_PROXY_ROLE, tokenAddress);

  console.log("Initial roles configured successfully.");
  console.log("---");
  console.log("Deployment is complete! Copy the addresses above for your frontend.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
