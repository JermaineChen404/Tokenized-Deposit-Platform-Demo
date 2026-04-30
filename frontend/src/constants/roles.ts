import type { Address } from "viem";
import { keccak256, toBytes } from "viem";
import { TOKENIZED_DEPOSIT_ADDRESS, tokenizedDepositABI } from "./abi";
import { COMPLIANCE_ADDRESS, complianceABI } from "./admin";
import {
  INTEREST_GOVERNANCE_ADDRESS, TX_GOVERNANCE_ADDRESS,
  INTEREST_MANAGER_ADDRESS, BRIDGE_ADDRESS,
  interestGovernanceABI, txGovernanceABI,
  interestManagerABI, bridgeABI,
} from "./governance";

export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;

export const BANK_ROLE = keccak256(toBytes("BANK_ROLE"));
export const COMPLIANCE_ROLE = keccak256(toBytes("COMPLIANCE_ROLE"));
export const RATE_UPDATER_ROLE = keccak256(toBytes("RATE_UPDATER_ROLE"));
export const VALIDATOR_ROLE = keccak256(toBytes("VALIDATOR_ROLE"));
export const GOVERNANCE_PROXY_ROLE = keccak256(toBytes("GOVERNANCE_PROXY_ROLE"));
export const BRIDGE_ROLE = keccak256(toBytes("BRIDGE_ROLE"));

export interface RoleDef {
  key: string;
  label: string;
  contractAddress: Address;
  abi: typeof tokenizedDepositABI;
  roleHash: `0x${string}`;
}

export const ALL_CONTRACT_ROLES: RoleDef[] = [
  { key: "td-admin", label: "TokenizedDeposit — DEFAULT_ADMIN_ROLE", contractAddress: TOKENIZED_DEPOSIT_ADDRESS as Address, abi: tokenizedDepositABI, roleHash: DEFAULT_ADMIN_ROLE },
  { key: "td-bank", label: "TokenizedDeposit — BANK_ROLE", contractAddress: TOKENIZED_DEPOSIT_ADDRESS as Address, abi: tokenizedDepositABI, roleHash: BANK_ROLE },
  { key: "comp-admin", label: "Compliance — DEFAULT_ADMIN_ROLE", contractAddress: COMPLIANCE_ADDRESS, abi: complianceABI as never, roleHash: DEFAULT_ADMIN_ROLE },
  { key: "comp-comp", label: "Compliance — COMPLIANCE_ROLE", contractAddress: COMPLIANCE_ADDRESS, abi: complianceABI as never, roleHash: COMPLIANCE_ROLE },
  { key: "im-admin", label: "InterestManager — DEFAULT_ADMIN_ROLE", contractAddress: INTEREST_MANAGER_ADDRESS, abi: interestManagerABI as never, roleHash: DEFAULT_ADMIN_ROLE },
  { key: "im-rate", label: "InterestManager — RATE_UPDATER_ROLE", contractAddress: INTEREST_MANAGER_ADDRESS, abi: interestManagerABI as never, roleHash: RATE_UPDATER_ROLE },
  { key: "ig-admin", label: "InterestRateGovernance — DEFAULT_ADMIN_ROLE", contractAddress: INTEREST_GOVERNANCE_ADDRESS, abi: interestGovernanceABI as never, roleHash: DEFAULT_ADMIN_ROLE },
  { key: "ig-validator", label: "InterestRateGovernance — VALIDATOR_ROLE", contractAddress: INTEREST_GOVERNANCE_ADDRESS, abi: interestGovernanceABI as never, roleHash: VALIDATOR_ROLE },
  { key: "ig-proxy", label: "InterestRateGovernance — GOVERNANCE_PROXY_ROLE", contractAddress: INTEREST_GOVERNANCE_ADDRESS, abi: interestGovernanceABI as never, roleHash: GOVERNANCE_PROXY_ROLE },
  { key: "txg-admin", label: "TxValidationGovernance — DEFAULT_ADMIN_ROLE", contractAddress: TX_GOVERNANCE_ADDRESS, abi: txGovernanceABI as never, roleHash: DEFAULT_ADMIN_ROLE },
  { key: "txg-validator", label: "TxValidationGovernance — VALIDATOR_ROLE", contractAddress: TX_GOVERNANCE_ADDRESS, abi: txGovernanceABI as never, roleHash: VALIDATOR_ROLE },
  { key: "txg-proxy", label: "TxValidationGovernance — GOVERNANCE_PROXY_ROLE", contractAddress: TX_GOVERNANCE_ADDRESS, abi: txGovernanceABI as never, roleHash: GOVERNANCE_PROXY_ROLE },
  { key: "bridge-admin", label: "CrossChainBridge — DEFAULT_ADMIN_ROLE", contractAddress: BRIDGE_ADDRESS, abi: bridgeABI as never, roleHash: DEFAULT_ADMIN_ROLE },
  { key: "bridge-bridge", label: "CrossChainBridge — BRIDGE_ROLE", contractAddress: BRIDGE_ADDRESS, abi: bridgeABI as never, roleHash: BRIDGE_ROLE },
];
