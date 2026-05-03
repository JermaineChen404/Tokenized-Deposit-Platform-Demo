import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import hardhat from "hardhat";

const { ethers } = hardhat;

const DEFAULTS = {
  tokenizedDeposit: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  compliance: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
};

function readDeploymentJson(rootDir) {
  const deploymentPath = path.join(rootDir, "deployments.local.json");
  if (!fs.existsSync(deploymentPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  } catch {
    return null;
  }
}

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
  const deployment = readDeploymentJson(rootDir);

  const tokenizedDepositAddress =
    deployment?.tokenizedDeposit ??
    readAddressFromTs(abiConstantsPath, "TOKENIZED_DEPOSIT_ADDRESS", DEFAULTS.tokenizedDeposit);

  const complianceAddress =
    deployment?.compliance ??
    readAddressFromTs(adminConstantsPath, "COMPLIANCE_ADDRESS", DEFAULTS.compliance);

  const [admin] = await ethers.getSigners();

  console.log("=== Permissions Bootstrap ===");
  console.log("Admin:", admin.address);
  console.log("TokenizedDeposit:", tokenizedDepositAddress);
  console.log("Compliance:      ", complianceAddress);

  const token = await ethers.getContractAt("TokenizedDeposit", tokenizedDepositAddress);
  const compliance = await ethers.getContractAt("Compliance", complianceAddress);

  // --- 1. Grant COMPLIANCE_ROLE to admin (needed to whitelist users) ---
  const complianceRole = await compliance.COMPLIANCE_ROLE();
  const adminHasCompliance = await compliance.hasRole(complianceRole, admin.address);
  if (!adminHasCompliance) {
    const tx = await compliance.grantRole(complianceRole, admin.address);
    await tx.wait();
    console.log("✅ Granted COMPLIANCE_ROLE to admin.");
  } else {
    console.log("⏭️  Admin already has COMPLIANCE_ROLE.");
  }

  // --- 2. Whitelist admin (needed to interact with the platform) ---
  const isWhitelisted = await compliance.isWhitelisted(admin.address);
  if (!isWhitelisted) {
    const tx = await compliance.whitelistUser(admin.address);
    await tx.wait();
    console.log("✅ Whitelisted admin.");
  } else {
    console.log("⏭️  Admin already whitelisted.");
  }

  // --- 3. Grant BANK_ROLE to admin (needed to issue deposits) ---
  const bankRole = await token.BANK_ROLE();
  const adminHasBank = await token.hasRole(bankRole, admin.address);
  if (!adminHasBank) {
    const tx = await token.grantRole(bankRole, admin.address);
    await tx.wait();
    console.log("✅ Granted BANK_ROLE to admin.");
  } else {
    console.log("⏭️  Admin already has BANK_ROLE.");
  }

  console.log("---");
  console.log("=== Bootstrap Complete ===");
  console.log("");
  console.log("The platform is ready. No banks, users, or deposits are pre-configured.");
  console.log("Use the Admin account to set everything up through the frontend:");
  console.log("");
  console.log("  Admin:", admin.address);
  console.log("  PK:    0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("");
  console.log("Suggested workflow:");
  console.log("  1. Admin adds banks      → Administration tab → Add Bank");
  console.log("  2. Admin whitelists users → Compliance tab → Whitelist User");
  console.log("  3. Admin issues deposits  → Banking tab → Issue Deposit");
  console.log("  4. Users transfer tokens  → Dashboard tab");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
