"use client";

import { useState } from "react";
import type { Address } from "viem";
import { isAddress, parseEther } from "viem";
import { toast } from "sonner";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { tokenizedDepositABI } from "@/constants/abi";
import { wagmiConfig } from "@/providers/web3-provider";

type Props = {
  tokenAddress: Address;
  tokenBalance: bigint | undefined;
  canWrite: boolean;
  refetchToken: () => Promise<unknown>;
};

function parseTokenInput(rawValue: string, fieldName: string) {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    toast.error(`${fieldName} is required.`);
    return null;
  }
  try {
    const amount = parseEther(trimmed);
    if (amount <= 0n) {
      toast.error(`${fieldName} must be greater than 0.`);
      return null;
    }
    return amount;
  } catch {
    toast.error(`Invalid ${fieldName.toLowerCase()} format.`);
    return null;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.split("\n")[0];
    if (/user rejected|user denied/i.test(message)) return "Transaction rejected in wallet.";
    return message;
  }
  return "Transaction failed.";
}

export function DashboardSection({ tokenAddress, tokenBalance, canWrite, refetchToken }: Props) {
  const { writeContractAsync } = useWriteContract();
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const execute = async ({
    actionId,
    loadingMessage,
    successMessage,
    write,
  }: {
    actionId: string;
    loadingMessage: string;
    successMessage: string;
    write: () => Promise<`0x${string}`>;
  }) => {
    if (!canWrite) {
      toast.error("Connect wallet and switch to Hardhat Localhost (31337).");
      return;
    }
    setActiveAction(actionId);
    try {
      const tx = (async () => {
        const hash = await write();
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      })();
      await toast.promise(tx, { loading: loadingMessage, success: successMessage, error: (e) => getErrorMessage(e) });
      await refetchToken();
    } finally {
      setActiveAction(null);
    }
  };

  const handleTransfer = async () => {
    const recipient = transferRecipient.trim();
    if (!isAddress(recipient)) { toast.error("Recipient must be a valid EVM address."); return; }
    const amount = parseTokenInput(transferAmount, "Transfer amount");
    if (amount === null) return;
    if (amount > (tokenBalance ?? 0n)) { toast.error("Transfer amount exceeds your token balance."); return; }
    await execute({
      actionId: "transfer", loadingMessage: "Transferring...", successMessage: "Transfer confirmed.",
      write: () => writeContractAsync({ address: tokenAddress, abi: tokenizedDepositABI, functionName: "swapTokens", args: [recipient as Address, amount] }),
    });
    setTransferAmount("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transfer Interface</CardTitle>
        <CardDescription>Tiered-fee transfer via <span className="font-mono">swapTokens()</span> (0.15%–0.25%).</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="recipient-address">Recipient Address</Label>
          <Input id="recipient-address" placeholder="0x..." value={transferRecipient} onChange={(e) => setTransferRecipient(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="transfer-amount">Amount (TDHK)</Label>
          <Input id="transfer-amount" inputMode="decimal" placeholder="e.g. 10" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)} />
        </div>
        <Button className="w-full" onClick={handleTransfer} loading={activeAction === "transfer"} disabled={!canWrite}>
          <ArrowLeftRight className="h-4 w-4" /> Transfer Tokens
        </Button>
      </CardContent>
    </Card>
  );
}
