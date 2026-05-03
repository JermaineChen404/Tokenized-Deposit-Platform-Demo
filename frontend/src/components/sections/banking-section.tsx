"use client";

import { useState } from "react";
import type { Address } from "viem";
import { formatEther, isAddress, parseEther, zeroAddress } from "viem";
import { toast } from "sonner";
import { useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Coins, TrendingUp, Wallet, BadgeCheck, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tokenizedDepositABI } from "@/constants/abi";
import { wagmiConfig } from "@/providers/web3-provider";

type Props = {
  tokenAddress: Address;
  accountAddress: Address;
  canWrite: boolean;
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

export function BankingSection({ tokenAddress, accountAddress, canWrite, refetchToken }: Props) {
  const { writeContractAsync } = useWriteContract();
  const [issueUser, setIssueUser] = useState("");
  const [issueAmount, setIssueAmount] = useState("");
  const [redeemUser, setRedeemUser] = useState("");
  const [redeemAmount, setRedeemAmount] = useState("");
  const [enterUser, setEnterUser] = useState("");
  const [accrueUser, setAccrueUser] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const connectedOrDefault = (input: string) => (input.trim() || accountAddress) as Address;

  const { data: pendingFeesRaw, refetch: refetchFees } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "pendingFees",
    args: [accountAddress], query: { enabled: accountAddress !== zeroAddress },
  });

  const { data: hasEntered, refetch: refetchHasEntered } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "hasEntered",
    args: [connectedOrDefault(enterUser)], query: { enabled: true },
  });

  const { data: lastAccrualRaw } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "lastAccrualTimestamp",
    args: [connectedOrDefault(accrueUser)], query: { enabled: true },
  });
  const lastAccrual = lastAccrualRaw as bigint | null | undefined;

  const execute = async (actionId: string, loading: string, success: string, write: () => Promise<`0x${string}`>) => {
    if (!canWrite) { toast.error("Connect wallet and switch to Hardhat Localhost (31337)."); return; }
    setActiveAction(actionId);
    try {
      const tx = (async () => { const h = await write(); await waitForTransactionReceipt(wagmiConfig, { hash: h }); return h; })();
      await toast.promise(tx, { loading, success, error: (e) => getErrorMessage(e) });
      await Promise.all([refetchToken(), refetchFees(), refetchHasEntered()]);
    } finally { setActiveAction(null); }
  };

  const handleIssue = async () => {
    const user = issueUser.trim();
    if (!isAddress(user)) { toast.error("Valid address required."); return; }
    const amount = parseTokenInput(issueAmount, "Issue amount");
    if (amount === null) return;
    await execute("issue", "Issuing deposit...", "Deposit issued.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "issueDeposit", args: [user as Address, amount] }));
    setIssueAmount("");
  };

  const handleRedeem = async () => {
    const user = redeemUser.trim();
    if (!isAddress(user)) { toast.error("Valid address required."); return; }
    const amount = parseTokenInput(redeemAmount, "Redeem amount");
    if (amount === null) return;
    await execute("redeem", "Redeeming deposit...", "Deposit redeemed.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "redeemDeposit", args: [user as Address, amount] }));
    setRedeemAmount("");
  };

  const handleEnter = async () => {
    const user = enterUser.trim();
    if (!isAddress(user)) { toast.error("Valid address required."); return; }
    await execute("enter", "Entering system...", "200 TDHK incentive minted.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "enterSystem", args: [user as Address] }));
  };

  const handleAccrue = async () => {
    const target = accrueUser.trim() || accountAddress;
    if (!isAddress(target)) { toast.error("Valid address required."); return; }
    await execute("accrue", "Accruing interest...", "Interest accrued.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "accrueInterest", args: [target as Address] }));
  };

  const handleClaim = async () => {
    await execute("claim", "Claiming fees...", "Fees claimed.",
      () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "claimFees", args: [] }));
  };

  return (
    <section className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Issue Deposit</CardTitle>
            <CardDescription>Mint TDHK to a whitelisted user (BANK_ROLE).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>User Address</Label><Input placeholder="0x..." value={issueUser} onChange={(e) => setIssueUser(e.target.value)} /></div>
            <div className="space-y-2"><Label>Amount (TDHK)</Label><Input inputMode="decimal" placeholder="e.g. 1000" value={issueAmount} onChange={(e) => setIssueAmount(e.target.value)} /></div>
            <Button className="w-full" onClick={handleIssue} loading={activeAction === "issue"} disabled={!canWrite}>Issue Deposit</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" />Redeem Deposit</CardTitle>
            <CardDescription>Burn TDHK from a user (BANK_ROLE).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>User Address</Label><Input placeholder="0x..." value={redeemUser} onChange={(e) => setRedeemUser(e.target.value)} /></div>
            <div className="space-y-2"><Label>Amount (TDHK)</Label><Input inputMode="decimal" placeholder="e.g. 500" value={redeemAmount} onChange={(e) => setRedeemAmount(e.target.value)} /></div>
            <Button className="w-full" variant="destructive" onClick={handleRedeem} loading={activeAction === "redeem"} disabled={!canWrite}>Redeem Deposit</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" />Enter System</CardTitle>
            <CardDescription>Grant 200 TDHK one-time incentive (BANK_ROLE).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>User Address</Label><Input placeholder="0x..." value={enterUser} onChange={(e) => setEnterUser(e.target.value)} /></div>
            {enterUser.trim() && isAddress(enterUser.trim()) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                System entry: <strong>{hasEntered ? "Already entered" : "Not yet entered"}</strong>
              </div>
            )}
            <Button className="w-full" onClick={handleEnter} loading={activeAction === "enter"} disabled={!canWrite}>Enter System</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Accrue Interest</CardTitle>
            <CardDescription>Compound interest for a user (BANK_ROLE, 1-day cooldown).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>User Address</Label><Input placeholder="Leave empty for self" value={accrueUser} onChange={(e) => setAccrueUser(e.target.value)} /></div>
            {lastAccrual != null && lastAccrual > 0n && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                Last accrual: <strong>{new Date(Number(lastAccrual) * 1000).toLocaleString()}</strong>
              </div>
            )}
            <Button className="w-full" onClick={handleAccrue} loading={activeAction === "accrue"} disabled={!canWrite}>Accrue Interest</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BadgeCheck className="h-5 w-5" />Claim Fees</CardTitle>
          <CardDescription>Pull-payment dividend claim for the connected bank.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
            <span className="text-sm text-slate-600 dark:text-slate-400">Claimable fees: </span>
            <strong className="text-lg">{pendingFeesRaw !== undefined ? `${Number(formatEther(pendingFeesRaw as bigint)).toFixed(4)} TDHK` : "Loading..."}</strong>
          </div>
          <Button className="w-full" onClick={handleClaim} loading={activeAction === "claim"} disabled={!canWrite || (pendingFeesRaw as bigint ?? 0n) === 0n}>Claim Fees</Button>
        </CardContent>
      </Card>
    </section>
  );
}
