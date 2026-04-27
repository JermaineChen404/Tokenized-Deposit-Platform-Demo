"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  Activity,
  ArrowLeftRight,
  CircleAlert,
  Landmark,
  PiggyBank,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { type Address, formatEther, isAddress, parseEther, zeroAddress } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain, useWriteContract } from "wagmi";
import { waitForTransactionReceipt } from "wagmi/actions";
import { hardhat } from "wagmi/chains";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { complianceABI, COMPLIANCE_ADDRESS } from "@/constants/admin";
import { tokenizedDepositABI, TOKENIZED_DEPOSIT_ADDRESS } from "@/constants/abi";
import { wagmiConfig } from "@/providers/web3-provider";

function formatTokenAmount(value: bigint | undefined) {
  if (value === undefined) return "0.0000";
  const [wholePart, decimalPart = ""] = formatEther(value).split(".");
  const wholeWithCommas = wholePart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const safeDecimal = (decimalPart + "0000").slice(0, 4);
  return `${wholeWithCommas}.${safeDecimal}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.split("\n")[0];
    if (/user rejected|user denied/i.test(message)) {
      return "Transaction rejected in wallet.";
    }
    return message;
  }
  return "Transaction failed.";
}

export default function Home() {
  const tokenizedDepositAddress = TOKENIZED_DEPOSIT_ADDRESS as Address;
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [accrueTarget, setAccrueTarget] = useState("");
  const [whitelistTarget, setWhitelistTarget] = useState("");
  const [activeAction, setActiveAction] = useState<string | null>(null);

  const accountAddress = (address ?? zeroAddress) as Address;
  const canRead = isConnected && Boolean(address);
  const onSupportedChain = chainId === hardhat.id;
  const canWrite = canRead && onSupportedChain;

  const {
    data: tokenBalance,
    isLoading: isTokenBalanceLoading,
    refetch: refetchTokenBalance,
  } = useReadContract({
    address: tokenizedDepositAddress,
    abi: tokenizedDepositABI,
    functionName: "balanceOf",
    args: [accountAddress],
    query: { enabled: canRead },
  });

  const {
    data: stakedBalance,
    isLoading: isStakedBalanceLoading,
    refetch: refetchStakedBalance,
  } = useReadContract({
    address: tokenizedDepositAddress,
    abi: tokenizedDepositABI,
    functionName: "stakedBalances",
    args: [accountAddress],
    query: { enabled: canRead },
  });

  const walletLabel = useMemo(() => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const parseTokenInput = (rawValue: string, fieldName: string) => {
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
  };

  const executeTransaction = async ({
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
      const transactionPromise = (async () => {
        const hash = await write();
        await waitForTransactionReceipt(wagmiConfig, { hash });
        return hash;
      })();

      await toast.promise(transactionPromise, {
        loading: loadingMessage,
        success: successMessage,
        error: (error) => getErrorMessage(error),
      });

      await Promise.all([refetchTokenBalance(), refetchStakedBalance()]);
    } finally {
      setActiveAction(null);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: hardhat.id });
      toast.success("Switched to Hardhat Localhost network.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleStake = async () => {
    const amount = parseTokenInput(stakeAmount, "Stake amount");
    if (amount === null) return;

    await executeTransaction({
      actionId: "stake",
      loadingMessage: "Submitting stake transaction...",
      successMessage: "Stake confirmed.",
      write: () =>
        writeContractAsync({
          address: tokenizedDepositAddress,
          abi: tokenizedDepositABI,
          functionName: "stakeDeposit",
          args: [amount],
        }),
    });

    setStakeAmount("");
  };

  const handleUnstake = async () => {
    const amount = parseTokenInput(unstakeAmount, "Unstake amount");
    if (amount === null) return;

    await executeTransaction({
      actionId: "unstake",
      loadingMessage: "Submitting unstake transaction...",
      successMessage: "Unstake confirmed.",
      write: () =>
        writeContractAsync({
          address: tokenizedDepositAddress,
          abi: tokenizedDepositABI,
          functionName: "withdrawStake",
          args: [amount],
        }),
    });

    setUnstakeAmount("");
  };

  const handleTransfer = async () => {
    const recipient = transferRecipient.trim();
    if (!isAddress(recipient)) {
      toast.error("Recipient must be a valid EVM address.");
      return;
    }

    const amount = parseTokenInput(transferAmount, "Transfer amount");
    if (amount === null) return;

    await executeTransaction({
      actionId: "transfer",
      loadingMessage: "Submitting transfer transaction...",
      successMessage: "Transfer confirmed.",
      write: () =>
        writeContractAsync({
          address: tokenizedDepositAddress,
          abi: tokenizedDepositABI,
          functionName: "transferTokens",
          args: [recipient as Address, amount],
        }),
    });

    setTransferAmount("");
  };

  const handleAccrueInterest = async () => {
    const target = accrueTarget.trim() || address;
    if (!target || !isAddress(target)) {
      toast.error("Provide a valid address to accrue interest for.");
      return;
    }

    await executeTransaction({
      actionId: "accrue",
      loadingMessage: "Submitting accrue interest transaction...",
      successMessage: "Interest accrual confirmed.",
      write: () =>
        writeContractAsync({
          address: tokenizedDepositAddress,
          abi: tokenizedDepositABI,
          functionName: "accrueInterest",
          args: [target as Address],
        }),
    });
  };

  const handleWhitelist = async () => {
    const target = whitelistTarget.trim();
    if (!isAddress(target)) {
      toast.error("Provide a valid address to whitelist.");
      return;
    }

    await executeTransaction({
      actionId: "whitelist",
      loadingMessage: "Submitting whitelist transaction...",
      successMessage: "Whitelist update confirmed.",
      write: () =>
        writeContractAsync({
          address: COMPLIANCE_ADDRESS,
          abi: complianceABI,
          functionName: "whitelistUser",
          args: [target as Address],
        }),
    });

    setWhitelistTarget("");
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-24 left-[-8%] h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute right-[-6%] top-12 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-400/15" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <Landmark className="h-3.5 w-3.5" />
                Regulated Tokenized Deposits
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
                Tokenized Deposit Dashboard
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
                Securely manage deposit issuance flows with on-chain staking, compliant transfers, and governance-linked admin actions.
              </p>
            </div>

            <div className="flex items-center justify-start md:justify-end">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <ConnectButton accountStatus="address" showBalance={false} chainStatus="name" />
              </div>
            </div>
          </div>
        </section>

        {isConnected && !onSupportedChain ? (
          <Card className="border-amber-300/60 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-900/20">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">Unsupported Network</p>
                  <p className="text-sm text-amber-800/80 dark:text-amber-300/80">
                    Please switch your wallet to Hardhat Localhost (Chain ID 31337) to execute contract actions.
                  </p>
                </div>
              </div>
              <Button variant="outline" onClick={handleSwitchNetwork} loading={isSwitchingChain}>
                Switch Network
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Wallet className="h-4 w-4" />
                Token Balance
              </CardDescription>
              <CardTitle className="text-2xl">
                {isTokenBalanceLoading ? "Loading..." : `${formatTokenAmount(tokenBalance as bigint)} TDHK`}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <PiggyBank className="h-4 w-4" />
                Staked Balance
              </CardDescription>
              <CardTitle className="text-2xl">
                {isStakedBalanceLoading ? "Loading..." : `${formatTokenAmount(stakedBalance as bigint)} TDHK`}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Session Status
              </CardDescription>
              <CardTitle className="text-2xl">{isConnected ? "Connected" : "Disconnected"}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Account Snapshot</CardTitle>
            <CardDescription>Live wallet and contract context on your selected network.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Wallet</TableCell>
                  <TableCell className="font-mono text-xs sm:text-sm">{walletLabel}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Network</TableCell>
                  <TableCell>{onSupportedChain ? "Hardhat Localhost (31337)" : `Chain ID ${chainId ?? "Unknown"}`}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>TokenizedDeposit</TableCell>
                  <TableCell className="font-mono text-xs sm:text-sm">{TOKENIZED_DEPOSIT_ADDRESS}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Compliance</TableCell>
                  <TableCell className="font-mono text-xs sm:text-sm">{COMPLIANCE_ADDRESS}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Staking Interface</CardTitle>
              <CardDescription>Lock TDHK for 30 days with on-chain stake and withdraw transactions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="stake-amount">Stake Amount (TDHK)</Label>
                <Input
                  id="stake-amount"
                  inputMode="decimal"
                  placeholder="e.g. 100.5"
                  value={stakeAmount}
                  onChange={(event) => setStakeAmount(event.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleStake}
                loading={activeAction === "stake"}
                disabled={!canWrite}
              >
                Stake Deposit
              </Button>

              <div className="space-y-2">
                <Label htmlFor="unstake-amount">Withdraw Staked Amount (TDHK)</Label>
                <Input
                  id="unstake-amount"
                  inputMode="decimal"
                  placeholder="e.g. 25"
                  value={unstakeAmount}
                  onChange={(event) => setUnstakeAmount(event.target.value)}
                />
              </div>

              <Button
                className="w-full"
                variant="outline"
                onClick={handleUnstake}
                loading={activeAction === "unstake"}
                disabled={!canWrite}
              >
                Withdraw Stake
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transfer Interface</CardTitle>
              <CardDescription>
                Execute compliant peer transfers via <span className="font-mono">transferTokens()</span> with protocol fee logic.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="recipient-address">Recipient Address</Label>
                <Input
                  id="recipient-address"
                  placeholder="0x..."
                  value={transferRecipient}
                  onChange={(event) => setTransferRecipient(event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="transfer-amount">Amount (TDHK)</Label>
                <Input
                  id="transfer-amount"
                  inputMode="decimal"
                  placeholder="e.g. 10"
                  value={transferAmount}
                  onChange={(event) => setTransferAmount(event.target.value)}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleTransfer}
                loading={activeAction === "transfer"}
                disabled={!canWrite}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Transfer Tokens
              </Button>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Admin and Bank Actions
            </CardTitle>
            <CardDescription>
              Optional MVP controls for interest accrual and KYC whitelisting. Role-gated by smart contract permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <Label htmlFor="accrue-user">Accrue Interest For Address</Label>
              <Input
                id="accrue-user"
                placeholder="Leave empty to use connected wallet"
                value={accrueTarget}
                onChange={(event) => setAccrueTarget(event.target.value)}
              />
              <Button
                className="w-full"
                variant="secondary"
                onClick={handleAccrueInterest}
                loading={activeAction === "accrue"}
                disabled={!canWrite}
              >
                Trigger accrueInterest()
              </Button>
            </div>

            <div className="space-y-3 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
              <Label htmlFor="whitelist-user">Whitelist User Address</Label>
              <Input
                id="whitelist-user"
                placeholder="0x..."
                value={whitelistTarget}
                onChange={(event) => setWhitelistTarget(event.target.value)}
              />
              <Button
                className="w-full"
                variant="outline"
                onClick={handleWhitelist}
                loading={activeAction === "whitelist"}
                disabled={!canWrite}
              >
                Trigger whitelistUser()
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
