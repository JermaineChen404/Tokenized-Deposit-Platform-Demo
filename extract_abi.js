import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const depositArtifact = JSON.parse(
	fs.readFileSync(path.join(__dirname, "artifacts/contracts/Project.sol/TokenizedDeposit.json"), "utf8")
);

let tokenAddress = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";
let complianceAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const deploymentFile = path.join(__dirname, "deployments.local.json");
if (fs.existsSync(deploymentFile)) {
	try {
		const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
		if (typeof deployment.tokenizedDeposit === "string") {
			tokenAddress = deployment.tokenizedDeposit;
		}
		if (typeof deployment.compliance === "string") {
			complianceAddress = deployment.compliance;
		}
	} catch {
		// Fall back to default address when deployment metadata is invalid.
	}
}

const abiContent = `export const TOKENIZED_DEPOSIT_ADDRESS = "${tokenAddress}" as const;

export const tokenizedDepositABI = ${JSON.stringify(depositArtifact.abi, null, 2)} as const;
`;

fs.mkdirSync(path.join(__dirname, "frontend/src/constants"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "frontend/src/constants/abi.ts"), abiContent);

const adminConstantsPath = path.join(__dirname, "frontend/src/constants/admin.ts");
if (fs.existsSync(adminConstantsPath)) {
	const adminSource = fs.readFileSync(adminConstantsPath, "utf8");
	const updatedAdminSource = adminSource.replace(
		/(export const COMPLIANCE_ADDRESS = ")0x[a-fA-F0-9]{40}(" as Address;)/,
		`$1${complianceAddress}$2`
	);
	fs.writeFileSync(adminConstantsPath, updatedAdminSource);
}

console.log("ABI extracted successfully.");
