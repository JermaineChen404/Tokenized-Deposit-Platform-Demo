import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import hardhat from "hardhat";

const { ethers } = hardhat;

const DEFAULTS = {
  tokenizedDeposit: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  compliance: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
};

function readAddressFromTs(filePath, constantName, fallback) {
  if (!fs.existsSync(filePath)) return fallback;

  const source = fs.readFileSync(filePath, "utf8");
  const pattern = new RegExp(`export\\s+const\\s+${constantName}\\s*=\\s*\"(0x[a-fA-F0-9]{40})\"`);
  const match = source.match(pattern);

  return match?.[1] ?? fallback;
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const rootDir = path.resolve(__dirname, "..");

  const abiConstantsPath = path.join(rootDir, "frontend", "src", "constants", "abi.ts");
  const adminConstantsPath = path.join(rootDir, "frontend", "src", "constants", "admin.ts");

  const tokenizedDepositAddress = readAddressFromTs(
    abiConstantsPath,
    "TOKENIZED_DEPOSIT_ADDRESS",
    DEFAULTS.tokenizedDeposit
  );

  const complianceAddress = readAddressFromTs(
    adminConstantsPath,
    "COMPLIANCE_ADDRESS",
    DEFAULTS.compliance
  );

  const [deployer, user2] = await ethers.getSigners();

  console.log("Bootstrapping local state with deployer:", deployer.address);
  console.log("TokenizedDeposit:", tokenizedDepositAddress);
  console.log("Compliance:", complianceAddress);
  console.log("Secondary test user:", user2.address);

  const token = await ethers.getContractAt("TokenizedDeposit", tokenizedDepositAddress);
  const compliance = await ethers.getContractAt("Compliance", complianceAddress);

  const complianceRole = await compliance.COMPLIANCE_ROLE();
  const deployerHasComplianceRole = await compliance.hasRole(complianceRole, deployer.address);
  if (!deployerHasComplianceRole) {
    const tx = await compliance.grantRole(complianceRole, deployer.address);
    await tx.wait();
    console.log("Granted COMPLIANCE_ROLE to deployer.");
  } else {
    console.log("Deployer already has COMPLIANCE_ROLE.");
  }

  const usersToWhitelist = [deployer.address, user2.address];
  for (const user of usersToWhitelist) {
    const isWhitelisted = await compliance.isWhitelisted(user);
    if (!isWhitelisted) {
      const tx = await compliance.whitelistUser(user);
      await tx.wait();
      console.log("Whitelisted user:", user);
    } else {
      console.log("Already whitelisted:", user);
    }
  }

  const bankRole = await token.BANK_ROLE();
  const deployerIsBank = await token.hasRole(bankRole, deployer.address);
  if (!deployerIsBank) {
    const tx = await token.addBank(deployer.address, ethers.parseEther("3000000"), true);
    await tx.wait();
    console.log("Added deployer as founder bank.");
  } else {
    console.log("Deployer already has BANK_ROLE.");
  }

  const deployerBalance = await token.balanceOf(deployer.address);
  if (deployerBalance === 0n) {
    const tx = await token.issueDeposit(deployer.address, ethers.parseEther("5000"));
    await tx.wait();
    console.log("Issued 5000 TDHK to deployer.");
  } else {
    console.log("Deployer already has TDHK balance:", ethers.formatEther(deployerBalance));
  }

  const user2Balance = await token.balanceOf(user2.address);
  if (user2Balance === 0n) {
    const tx = await token.issueDeposit(user2.address, ethers.parseEther("1000"));
    await tx.wait();
    console.log("Issued 1000 TDHK to secondary user.");
  } else {
    console.log("Secondary user already has TDHK balance:", ethers.formatEther(user2Balance));
  }

  console.log("---");
  console.log("Local bootstrap complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
