"use client";

import { useState } from "react";
import type { Address } from "viem";
import { isAddress, parseEther } from "viem";
import { toast } from "sonner";
import { useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Building, RefreshCw, Shield, UserPlus, UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tokenizedDepositABI } from "@/constants/abi";
import { ALL_CONTRACT_ROLES, DEFAULT_ADMIN_ROLE } from "@/constants/roles";
import { wagmiConfig } from "@/providers/web3-provider";

type Props = {
  tokenAddress: Address;
  canWrite: boolean;
  isAdmin: boolean;
  refetchToken: () => Promise<unknown>;
};

function parseTokenInput(rawValue: string, fieldName: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) { toast.error(`${fieldName} is required.`); return null; }
  try {
    const amount = parseEther(trimmed);
    if (amount <= 0n) { toast.error(`${fieldName} must be greater than 0.`); return null; }
    return amount;
  } catch { toast.error(`Invalid ${fieldName.toLowerCase()} format.`); return null; }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.split("\n")[0];
    if (/user rejected|user denied/i.test(message)) return "Transaction rejected in wallet.";
    return message;
  }
  return "Transaction failed.";
}

export function AdminSection({ tokenAddress, canWrite, isAdmin, refetchToken }: Props) {
  const { writeContractAsync } = useWriteContract();
  const [bankAddress, setBankAddress] = useState("");
  const [bankContribution, setBankContribution] = useState("");
  const [bankFounder, setBankFounder] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const [grantRoleKey, setGrantRoleKey] = useState(ALL_CONTRACT_ROLES[0].key);
  const [grantAddress, setGrantAddress] = useState("");

  const { data: totalShares } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "totalShares",
  });

  const { data: lastReevaluation } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "lastReevaluation",
  });

  const { data: validatorCount } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "validators",
    args: [BigInt(0)],
  });

  const execute = async (actionId: string, loading: string, success: string, write: () => Promise<`0x${string}`>) => {
    if (!canWrite) { toast.error("Connect wallet and switch to Hardhat Localhost (31337)."); return; }
    setActiveAction(actionId);
    try {
      const tx = (async () => { const h = await write(); await waitForTransactionReceipt(wagmiConfig, { hash: h }); return h; })();
      await toast.promise(tx, { loading, success, error: (e) => getErrorMessage(e) });
      await refetchToken();
    } finally { setActiveAction(null); }
  };

  const handleAddBank = async () => {
    const addr = bankAddress.trim();
    if (!isAddress(addr)) { toast.error("Valid address required."); return; }
    const contribution = parseTokenInput(bankContribution, "Contribution");
    if (contribution === null) return;
    await execute("addBank", "Adding bank...", "Bank added.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "addBank", args: [addr as Address, contribution, bankFounder] }));
    setBankAddress("");
    setBankContribution("");
  };

  const handleReevaluate = async () => {
    await execute("reevaluate", "Reevaluating shares...", "Shares reevaluated.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "reevaluateShares", args: [] }));
  };

  const handleGrantRole = async () => {
    const addr = grantAddress.trim();
    if (!isAddress(addr)) { toast.error("Valid address required."); return; }
    const roleDef = ALL_CONTRACT_ROLES.find((r) => r.key === grantRoleKey);
    if (!roleDef) { toast.error("Select a role."); return; }
    await execute("grant", "Granting role...", "Role granted.",
      () => writeContractAsync({ address: roleDef.contractAddress, abi: roleDef.abi, functionName: "grantRole", args: [roleDef.roleHash, addr as Address] } as never));
    setGrantAddress("");
  };

  const handleRevokeRole = async () => {
    const addr = grantAddress.trim();
    if (!isAddress(addr)) { toast.error("Valid address required."); return; }
    const roleDef = ALL_CONTRACT_ROLES.find((r) => r.key === grantRoleKey);
    if (!roleDef) { toast.error("Select a role."); return; }
    await execute("revoke", "Revoking role...", "Role revoked.",
      () => writeContractAsync({ address: roleDef.contractAddress, abi: roleDef.abi, functionName: "revokeRole", args: [roleDef.roleHash, addr as Address] } as never));
    setGrantAddress("");
  };

  const lr = lastReevaluation as bigint | null | undefined;
  const canReevaluate = lr != null && lr > 0n
    ? Date.now() / 1000 >= Number(lr) + 90 * 24 * 60 * 60
    : true;

  if (!isAdmin) {
    return (
      <Card className="border-amber-300/60 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-900/20">
        <CardContent className="flex items-start gap-3 p-5">
          <Shield className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Admin Access Required</p>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80">Connect a wallet that holds DEFAULT_ADMIN_ROLE on TokenizedDeposit, Compliance, or InterestManager.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Add Bank</CardTitle>
            <CardDescription>Onboard a new bank validator with contribution share (DEFAULT_ADMIN_ROLE).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Bank Address</Label><Input placeholder="0x..." value={bankAddress} onChange={(e) => setBankAddress(e.target.value)} /></div>
            <div className="space-y-2"><Label>Contribution (TDHK)</Label><Input inputMode="decimal" placeholder="e.g. 1000000" value={bankContribution} onChange={(e) => setBankContribution(e.target.value)} /></div>
            <div className="flex items-center gap-3">
              <input id="founder" type="checkbox" checked={bankFounder} onChange={(e) => setBankFounder(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600" />
              <Label htmlFor="founder">Founder bank</Label>
            </div>
            <Button className="w-full" onClick={handleAddBank} loading={activeAction === "addBank"} disabled={!canWrite}>Add Bank</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><RefreshCw className="h-5 w-5" />Reevaluate Shares</CardTitle>
            <CardDescription>Quarterly share redistribution based on fee generation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
              <div>Total shares: <strong>{totalShares ? String(totalShares) : "—"}</strong></div>
              <div>Last reevaluation: <strong>{lr != null && lr > 0n ? new Date(Number(lr) * 1000).toLocaleString() : "Never"}</strong></div>
              <div>Next eligible: <strong>{canReevaluate ? "Now" : (lr != null ? new Date((Number(lr) + 90 * 24 * 60 * 60) * 1000).toLocaleString() : "N/A")}</strong></div>
            </div>
            <Button className="w-full" onClick={handleReevaluate} loading={activeAction === "reevaluate"} disabled={!canWrite || !canReevaluate}>Reevaluate Shares</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />Manage Roles</CardTitle>
          <CardDescription>Grant or revoke AccessControl roles on any contract (requires DEFAULT_ADMIN_ROLE on that contract).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contract & Role</Label>
            <select
              value={grantRoleKey}
              onChange={(e) => setGrantRoleKey(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {ALL_CONTRACT_ROLES.map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input placeholder="0x..." value={grantAddress} onChange={(e) => setGrantAddress(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleGrantRole} loading={activeAction === "grant"} disabled={!canWrite}>
              <UserPlus className="h-4 w-4 mr-2" />Grant Role
            </Button>
            <Button className="flex-1" variant="destructive" onClick={handleRevokeRole} loading={activeAction === "revoke"} disabled={!canWrite}>
              <UserMinus className="h-4 w-4 mr-2" />Revoke Role
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
