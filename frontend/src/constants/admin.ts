import type { Address } from "viem";

export const COMPLIANCE_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address;

export const complianceABI = [
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "whitelistUser",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
