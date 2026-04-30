"use client";

import { useState } from "react";
import type { Address } from "viem";
import { isAddress, parseEther } from "viem";
import { toast } from "sonner";
import { useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bridgeABI, BRIDGE_ADDRESS } from "@/constants/governance";
import { wagmiConfig } from "@/providers/web3-provider";

type Props = {
  canWrite: boolean;
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

export function BridgeSection({ canWrite }: Props) {
  const { writeContractAsync } = useWriteContract();
  const [user, setUser] = useState("");
  const [amount, setAmount] = useState("");
  const [targetChain, setTargetChain] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const handleBridge = async () => {
    const addr = user.trim();
    if (!isAddress(addr)) { toast.error("Valid user address required."); return; }
    const amt = parseTokenInput(amount, "Bridge amount");
    if (amt === null) return;
    const chain = targetChain.trim();
    if (!chain) { toast.error("Target chain name required."); return; }
    if (!canWrite) { toast.error("Connect wallet and switch to Hardhat Localhost (31337)."); return; }

    setActiveAction("bridge");
    try {
      const tx = (async () => {
        const hash = await writeContractAsync({
          address: BRIDGE_ADDRESS, abi: bridgeABI, functionName: "initiateBridge",
          args: [addr as Address, amt, chain],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      })();
      await toast.promise(tx, { loading: "Initiating bridge...", success: "Bridge initiated.", error: (e) => getErrorMessage(e) });
      setAmount("");
      setTargetChain("");
    } finally { setActiveAction(null); }
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" />Cross-Chain Bridge</CardTitle>
          <CardDescription>Initiate a bridge transfer to another chain via the CrossChainBridge contract (BRIDGE_ROLE).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>User Address</Label><Input placeholder="0x..." value={user} onChange={(e) => setUser(e.target.value)} /></div>
          <div className="space-y-2"><Label>Amount (TDHK)</Label><Input inputMode="decimal" placeholder="e.g. 100" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="space-y-2"><Label>Target Chain</Label><Input placeholder="e.g. Ethereum, Polygon" value={targetChain} onChange={(e) => setTargetChain(e.target.value)} /></div>
          <Button className="w-full" onClick={handleBridge} loading={activeAction === "bridge"} disabled={!canWrite}>
            <Send className="h-4 w-4" /> Initiate Bridge
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
