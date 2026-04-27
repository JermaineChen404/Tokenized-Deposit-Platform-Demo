import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const depositArtifact = JSON.parse(
	fs.readFileSync(path.join(__dirname, "artifacts/contracts/Project.sol/TokenizedDeposit.json"), "utf8")
);

const abiContent = `export const TOKENIZED_DEPOSIT_ADDRESS = "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707" as const;

export const tokenizedDepositABI = ${JSON.stringify(depositArtifact.abi, null, 2)} as const;
`;

fs.mkdirSync(path.join(__dirname, "frontend/src/constants"), { recursive: true });
fs.writeFileSync(path.join(__dirname, "frontend/src/constants/abi.ts"), abiContent);

console.log("ABI extracted successfully.");