"use client";

import { useState, useEffect } from "react";
import type { Address } from "viem";
import { formatEther, isAddress } from "viem";
import { toast } from "sonner";
import { useReadContract, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { Gavel, Vote, FileText, Play, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  interestGovernanceABI, txGovernanceABI,
  INTEREST_GOVERNANCE_ADDRESS, TX_GOVERNANCE_ADDRESS,
  interestManagerABI, INTEREST_MANAGER_ADDRESS,
} from "@/constants/governance";
import { wagmiConfig } from "@/providers/web3-provider";

type GovType = "rate" | "tx";
type SubTab = "validator" | "proxy";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "validator", label: "As Validator" },
  { id: "proxy", label: "As Proxy" },
];

type Props = {
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

export function GovernanceSection({ accountAddress, canWrite }: Props) {
  const { writeContractAsync } = useWriteContract();
  const [govType, setGovType] = useState<GovType>("rate");
  const [subTab, setSubTab] = useState<SubTab>("validator");
  const [propRate, setPropRate] = useState("");
  const [propTxHash, setPropTxHash] = useState("");
  const [voteId, setVoteId] = useState("");
  const [voteChoice, setVoteChoice] = useState("for");
  const [proxyValidator, setProxyValidator] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const isRate = govType === "rate";
  const govAddr = isRate ? INTEREST_GOVERNANCE_ADDRESS : TX_GOVERNANCE_ADDRESS;

  const { data: proposalCounter } = useReadContract({
    address: govAddr, abi: interestGovernanceABI, functionName: "proposalCounter",
  });

  const { data: currentRate } = useReadContract({
    address: INTEREST_MANAGER_ADDRESS, abi: interestManagerABI, functionName: "interestRate",
    query: { enabled: isRate },
  });

  const { data: lastVoteTimestamp } = useReadContract({
    address: govAddr, abi: interestGovernanceABI, functionName: "lastVoteTimestamp",
  });

  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Math.floor(Date.now() / 1000));
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const COOLDOWN_SEC = 30; // matches contract PROPOSAL_COOLDOWN
  const cooldownRemaining = (lastVoteTimestamp != null && now > 0)
    ? Number(lastVoteTimestamp) + COOLDOWN_SEC - now
    : 0;
  const cooldownActive = cooldownRemaining > 0;

  const execute = async (actionId: string, loading: string, success: string, write: () => Promise<`0x${string}`>) => {
    if (!canWrite) { toast.error("Connect wallet and switch to Hardhat Localhost (31337)."); return; }
    setActiveAction(actionId);
    try {
      const tx = (async () => { const h = await write(); await waitForTransactionReceipt(wagmiConfig, { hash: h }); return h; })();
      await toast.promise(tx, { loading, success, error: (e) => getErrorMessage(e) });
    } finally { setActiveAction(null); }
  };

  const handleCreate = async () => {
    if (isRate) {
      const t = propRate.trim();
      if (!t || !/^\d+$/.test(t)) { toast.error("Enter a valid integer rate in bps."); return; }
      await execute("create", "Creating...", "Proposal created.",
        () => writeContractAsync({ address: govAddr, abi: interestGovernanceABI, functionName: "createProposal", args: [BigInt(t)] }));
      setPropRate("");
    } else {
      const t = propTxHash.trim();
      if (!t) { toast.error("Enter a TX hash."); return; }
      await execute("create", "Creating...", "Proposal created.",
        () => writeContractAsync({ address: govAddr, abi: txGovernanceABI, functionName: "createProposal", args: [t] }));
      setPropTxHash("");
    }
  };

  const handleCreateProxy = async () => {
    const v = proxyValidator.trim();
    if (!isAddress(v)) { toast.error("Valid validator address required."); return; }
    if (isRate) {
      const t = propRate.trim();
      if (!t || !/^\d+$/.test(t)) { toast.error("Enter rate in bps."); return; }
      await execute("createProxy", "Creating...", "Proposal created.",
        () => writeContractAsync({ address: govAddr, abi: interestGovernanceABI, functionName: "createProposalByProxy", args: [v as Address, BigInt(t)] }));
      setPropRate("");
    } else {
      const t = propTxHash.trim();
      if (!t) { toast.error("Enter a TX hash."); return; }
      await execute("createProxy", "Creating...", "Proposal created.",
        () => writeContractAsync({ address: govAddr, abi: txGovernanceABI, functionName: "createProposalByProxy", args: [v as Address, t] }));
      setPropTxHash("");
    }
    setProxyValidator("");
  };

  const handleVote = async () => {
    const id = voteId.trim();
    if (!id || !/^\d+$/.test(id)) { toast.error("Valid proposal ID required."); return; }
    await execute("vote", "Voting...", "Vote cast.",
      () => writeContractAsync({ address: govAddr, abi: interestGovernanceABI, functionName: "vote", args: [BigInt(id), voteChoice] }));
    setVoteId("");
  };

  const handleVoteProxy = async () => {
    const v = proxyValidator.trim();
    if (!isAddress(v)) { toast.error("Valid validator address required."); return; }
    const id = voteId.trim();
    if (!id || !/^\d+$/.test(id)) { toast.error("Valid proposal ID required."); return; }
    await execute("voteProxy", "Voting...", "Vote cast.",
      () => writeContractAsync({ address: govAddr, abi: interestGovernanceABI, functionName: "voteByProxy", args: [v as Address, BigInt(id), voteChoice] }));
    setVoteId(""); setProxyValidator("");
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setGovType("rate")}
          className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            isRate ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400")}>
          Interest Rate
        </button>
        <button type="button" onClick={() => setGovType("tx")}
          className={cn("rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            !isRate ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900" : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400")}>
          Transaction Validation
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Gavel className="h-5 w-5" />{isRate ? "Interest Rate Governance" : "Transaction Validation Governance"}</CardTitle>
          <CardDescription>
            {isRate ? (
              <>
                Propose and vote on base interest rates.
                {currentRate !== undefined && (
                  <span className="ml-1 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    Current: {Number(currentRate)} bps ({Number(currentRate) / 100}%)
                  </span>
                )}
              </>
            ) : (
              "Propose and vote on transaction hash approvals."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-6">
            {SUB_TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => setSubTab(t.id)}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  subTab === t.id ? "bg-white shadow-sm text-slate-900 dark:bg-slate-800 dark:text-slate-100" : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200")}>
                {t.label}
              </button>
            ))}
          </div>

          {subTab === "validator" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <Label className="mb-2 block font-semibold"><FileText className="inline h-4 w-4 mr-1" />Create Proposal</Label>
                {cooldownActive && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                    <Clock className="h-4 w-4 shrink-0" /> Cooldown active — {cooldownRemaining}s remaining before next proposal
                  </div>
                )}
                {isRate ? (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2"><Label>Rate (bps)</Label><Input placeholder="500" value={propRate} onChange={(e) => setPropRate(e.target.value)} /></div>
                    <Button onClick={handleCreate} loading={activeAction === "create"} disabled={!canWrite || cooldownActive}>Create</Button>
                  </div>
                ) : (
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2"><Label>TX Hash</Label><Input placeholder="0x..." value={propTxHash} onChange={(e) => setPropTxHash(e.target.value)} /></div>
                    <Button onClick={handleCreate} loading={activeAction === "create"} disabled={!canWrite || cooldownActive}>Create</Button>
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <Label className="mb-2 block font-semibold"><Vote className="inline h-4 w-4 mr-1" />Vote</Label>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[120px] space-y-2"><Label>Proposal ID</Label><Input placeholder="1" value={voteId} onChange={(e) => setVoteId(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Choice</Label>
                    <select value={voteChoice} onChange={(e) => setVoteChoice(e.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="for">For</option><option value="against">Against</option><option value="decline">Decline</option>
                    </select>
                  </div>
                  <Button onClick={handleVote} loading={activeAction === "vote"} disabled={!canWrite}>Vote</Button>
                </div>
              </div>
            </div>
          )}

          {subTab === "proxy" && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <Label className="mb-2 block font-semibold"><FileText className="inline h-4 w-4 mr-1" />Create Proposal by Proxy</Label>
                <div className="space-y-3">
                  <div className="space-y-2"><Label>Validator Address</Label><Input placeholder="0x..." value={proxyValidator} onChange={(e) => setProxyValidator(e.target.value)} /></div>
                  {isRate
                    ? <div className="space-y-2"><Label>Rate (bps)</Label><Input placeholder="500" value={propRate} onChange={(e) => setPropRate(e.target.value)} /></div>
                    : <div className="space-y-2"><Label>TX Hash</Label><Input placeholder="0x..." value={propTxHash} onChange={(e) => setPropTxHash(e.target.value)} /></div>
                  }
                  <Button onClick={handleCreateProxy} loading={activeAction === "createProxy"} disabled={!canWrite}>Create Proxy Proposal</Button>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <Label className="mb-2 block font-semibold"><Vote className="inline h-4 w-4 mr-1" />Vote by Proxy</Label>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[120px] space-y-2"><Label>Validator</Label><Input placeholder="0x..." value={proxyValidator} onChange={(e) => setProxyValidator(e.target.value)} /></div>
                  <div className="flex-1 min-w-[120px] space-y-2"><Label>Proposal ID</Label><Input placeholder="1" value={voteId} onChange={(e) => setVoteId(e.target.value)} /></div>
                  <div className="space-y-2"><Label>Choice</Label>
                    <select value={voteChoice} onChange={(e) => setVoteChoice(e.target.value)}
                      className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                      <option value="for">For</option><option value="against">Against</option><option value="decline">Decline</option>
                    </select>
                  </div>
                  <Button onClick={handleVoteProxy} loading={activeAction === "voteProxy"} disabled={!canWrite}>Vote by Proxy</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposals ({proposalCounter !== undefined ? String(proposalCounter) : "..."})</CardTitle>
          <CardDescription>All proposals on {isRate ? "InterestRateGovernance" : "TransactionValidationGovernance"}. Anyone can execute an approved proposal.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProposalTable govType={govType} canWrite={canWrite} />
        </CardContent>
      </Card>
    </section>
  );
}

function ProposalTable({ govType, canWrite }: { govType: GovType; canWrite: boolean }) {
  const isRate = govType === "rate";
  const govAddr = isRate ? INTEREST_GOVERNANCE_ADDRESS : TX_GOVERNANCE_ADDRESS;

  const { data: counter } = useReadContract({
    address: govAddr, abi: interestGovernanceABI, functionName: "proposalCounter",
  });
  const count = counter !== undefined ? Number(counter) : 0;
  if (count === 0) return <p className="text-sm text-slate-500 py-4">No proposals yet.</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead>{isRate ? "Rate (bps)" : "TX Hash"}</TableHead>
          <TableHead>For</TableHead>
          <TableHead>Against</TableHead>
          <TableHead>Declined</TableHead>
          <TableHead>Status</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: count }, (_, i) => i + 1).map((id) => (
          <ProposalRow key={id} govType={govType} proposalId={id} canWrite={canWrite} />
        ))}
      </TableBody>
    </Table>
  );
}

function ProposalRow({ govType, proposalId, canWrite }: { govType: GovType; proposalId: number; canWrite: boolean }) {
  const isRate = govType === "rate";
  const idBn = BigInt(proposalId);
  const rateAddr = INTEREST_GOVERNANCE_ADDRESS;
  const txAddr = TX_GOVERNANCE_ADDRESS;
  const govAddr = isRate ? rateAddr : txAddr;
  const { writeContractAsync } = useWriteContract();

  const { data: proposal } = useReadContract({
    address: govAddr, abi: interestGovernanceABI as never, functionName: "proposals", args: [idBn],
  });
  const p = proposal as [bigint, bigint, bigint, bigint, boolean, bigint] | undefined;

  const { data: rateValue } = useReadContract({
    address: rateAddr, abi: interestGovernanceABI, functionName: "rateProposals", args: [idBn],
    query: { enabled: isRate },
  });

  const { data: txValue } = useReadContract({
    address: txAddr, abi: txGovernanceABI, functionName: "txProposals", args: [idBn],
    query: { enabled: !isRate },
  });

  if (!p || (p[0] as bigint) === 0n) return (
    <TableRow><TableCell className="font-mono">#{proposalId}</TableCell><TableCell colSpan={6} className="text-slate-400">Not found</TableCell></TableRow>
  );

  const votesFor = p[1] as bigint;
  const votesAgainst = p[2] as bigint;
  const votesDeclined = p[3] as bigint;
  const executed = p[4] as boolean;
  const canExecute = !executed && votesFor > votesAgainst && votesFor > 0n;

  const getStatus = () => {
    if (executed) return <span className="text-emerald-600 font-medium">Executed</span>;
    if (votesDeclined > votesFor && votesDeclined > votesAgainst) return <span className="text-amber-600 font-medium">Declined</span>;
    if (votesFor > votesAgainst) return <span className="text-emerald-600 font-medium">Approved</span>;
    return <span className="text-slate-500 font-medium">Pending</span>;
  };

  const handleExecute = async () => {
    if (!canWrite) { toast.error("Connect wallet and switch to Hardhat Localhost (31337)."); return; }
    try {
      const h = await writeContractAsync({ address: govAddr, abi: interestGovernanceABI, functionName: "executeProposal", args: [idBn] });
      const tx = (async () => { await waitForTransactionReceipt(wagmiConfig, { hash: h }); return h; })();
      await toast.promise(tx, { loading: "Executing...", success: "Proposal executed.", error: (e: unknown) => getErrorMessage(e) });
    } catch { /* handled by toast */ }
  };

  const displayValue = isRate
    ? (rateValue !== undefined ? `${String(rateValue)} bps` : "...")
    : (txValue !== undefined ? String(txValue).slice(0, 18) + (String(txValue).length > 18 ? "..." : "") : "...");

  return (
    <TableRow>
      <TableCell className="font-mono">#{proposalId}</TableCell>
      <TableCell className="font-mono text-xs max-w-[200px] truncate">{displayValue}</TableCell>
      <TableCell>{formatEther(votesFor)}</TableCell>
      <TableCell>{formatEther(votesAgainst)}</TableCell>
      <TableCell>{formatEther(votesDeclined)}</TableCell>
      <TableCell>{getStatus()}</TableCell>
      <TableCell>
        {canExecute && (
          <Button size="sm" variant="outline" onClick={handleExecute} disabled={!canWrite}>
            <Play className="h-3.5 w-3.5 mr-1" /> Execute
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
