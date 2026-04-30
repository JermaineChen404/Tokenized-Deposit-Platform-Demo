"use client";

import { useState } from "react";
import type { Address } from "viem";
import { isAddress, zeroAddress } from "viem";
import { toast } from "sonner";
import { useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { ShieldCheck, ShieldOff, Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { complianceABI } from "@/constants/admin";
import { COMPLIANCE_ROLE } from "@/constants/roles";
import { wagmiConfig } from "@/providers/web3-provider";

type Props = {
  complianceAddress: Address;
  accountAddress: Address;
  canWrite: boolean;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.split("\n")[0];
    if (/user rejected|user denied/i.test(message)) return "Transaction rejected in wallet.";
    return message;
  }
  return "Transaction failed.";
}

export function ComplianceSection({ complianceAddress, accountAddress, canWrite }: Props) {
  const { writeContractAsync } = useWriteContract();
  const [whitelistUser, setWhitelistUser] = useState("");
  const [removeUser, setRemoveUser] = useState("");
  const [lookupUser, setLookupUser] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const { data: isComplianceAdmin } = useReadContract({
    address: complianceAddress, abi: complianceABI, functionName: "hasRole",
    args: [COMPLIANCE_ROLE, accountAddress], query: { enabled: canWrite },
  });

  const { data: isWhitelisted, refetch: refetchLookup } = useReadContract({
    address: complianceAddress, abi: complianceABI, functionName: "isWhitelisted",
    args: [isAddress(lookupUser.trim()) ? (lookupUser.trim() as Address) : zeroAddress],
    query: { enabled: isAddress(lookupUser.trim()) },
  });

  const execute = async (actionId: string, loading: string, success: string, write: () => Promise<`0x${string}`>) => {
    if (!canWrite) { toast.error("Connect wallet and switch to Hardhat Localhost (31337)."); return; }
    setActiveAction(actionId);
    try {
      const tx = (async () => { const h = await write(); await waitForTransactionReceipt(wagmiConfig, { hash: h }); return h; })();
      await toast.promise(tx, { loading, success, error: (e) => getErrorMessage(e) });
      refetchLookup();
    } finally { setActiveAction(null); }
  };

  const handleWhitelist = async () => {
    const user = whitelistUser.trim();
    if (!isAddress(user)) { toast.error("Valid address required."); return; }
    await execute("whitelist", "Whitelisting user...", "User whitelisted.",
      () => writeContractAsync({ address: complianceAddress, abi: complianceABI, functionName: "whitelistUser", args: [user as Address] }));
    setWhitelistUser("");
  };

  const handleRemove = async () => {
    const user = removeUser.trim();
    if (!isAddress(user)) { toast.error("Valid address required."); return; }
    await execute("remove", "Removing from whitelist...", "User removed from whitelist.",
      () => writeContractAsync({ address: complianceAddress, abi: complianceABI, functionName: "removeWhitelist", args: [user as Address] }));
    setRemoveUser("");
  };

  if (!isComplianceAdmin) {
    return (
      <Card className="border-amber-300/60 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-900/20">
        <CardContent className="flex items-start gap-3 p-5">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900 dark:text-amber-200">Compliance Access Required</p>
            <p className="text-sm text-amber-800/80 dark:text-amber-300/80">Connect a wallet that holds COMPLIANCE_ROLE on the Compliance contract.</p>
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
            <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" />Whitelist User</CardTitle>
            <CardDescription>Add address to KYC whitelist (COMPLIANCE_ROLE).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>User Address</Label><Input placeholder="0x..." value={whitelistUser} onChange={(e) => setWhitelistUser(e.target.value)} /></div>
            <Button className="w-full" onClick={handleWhitelist} loading={activeAction === "whitelist"} disabled={!canWrite}>Whitelist User</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ShieldOff className="h-5 w-5" />Remove from Whitelist</CardTitle>
            <CardDescription>Revoke KYC access for an address (COMPLIANCE_ROLE).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>User Address</Label><Input placeholder="0x..." value={removeUser} onChange={(e) => setRemoveUser(e.target.value)} /></div>
            <Button className="w-full" variant="destructive" onClick={handleRemove} loading={activeAction === "remove"} disabled={!canWrite}>Remove from Whitelist</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />KYC Status Lookup</CardTitle>
          <CardDescription>Check whether an address is currently KYC-whitelisted.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Address to check</Label><Input placeholder="0x..." value={lookupUser} onChange={(e) => setLookupUser(e.target.value)} /></div>
          {isAddress(lookupUser.trim()) && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
              <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
              {isWhitelisted === undefined ? (
                <span className="text-sm text-slate-400">Checking...</span>
              ) : isWhitelisted ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  <ShieldCheck className="h-4 w-4" /> Whitelisted
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                  <ShieldOff className="h-4 w-4" /> Not Whitelisted
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
