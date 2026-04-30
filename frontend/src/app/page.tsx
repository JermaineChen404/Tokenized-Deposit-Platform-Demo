"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Activity, CircleAlert, Landmark, PiggyBank, Wallet } from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { type Address, zeroAddress } from "viem";
import { formatEther } from "viem";
import { useAccount, useChainId, useReadContract, useSwitchChain } from "wagmi";
import { hardhat } from "wagmi/chains";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, type TabId } from "@/components/tabs";
import { DashboardSection } from "@/components/sections/dashboard-section";
import { BankingSection } from "@/components/sections/banking-section";
import { ComplianceSection } from "@/components/sections/compliance-section";
import { AdminSection } from "@/components/sections/admin-section";
import { GovernanceSection } from "@/components/sections/governance-section";
import { ValidatorsSection } from "@/components/sections/validators-section";
import { BridgeSection } from "@/components/sections/bridge-section";
import { tokenizedDepositABI, TOKENIZED_DEPOSIT_ADDRESS } from "@/constants/abi";
import { complianceABI, COMPLIANCE_ADDRESS } from "@/constants/admin";
import { INTEREST_MANAGER_ADDRESS, interestManagerABI } from "@/constants/governance";
import { DEFAULT_ADMIN_ROLE } from "@/constants/roles";

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
    if (/user rejected|user denied/i.test(message)) return "Transaction rejected in wallet.";
    return message;
  }
  return "Transaction failed.";
}

export default function Home() {
  const tokenAddress = TOKENIZED_DEPOSIT_ADDRESS as Address;
  const complianceAddress = COMPLIANCE_ADDRESS;
  const interestManagerAddress = INTEREST_MANAGER_ADDRESS;

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();

  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  const accountAddress = (address ?? zeroAddress) as Address;
  const canRead = isConnected && Boolean(address);
  const onSupportedChain = chainId === hardhat.id;
  const canWrite = canRead && onSupportedChain;

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");

  const {
    data: tokenBalance,
    isLoading: isTokenBalanceLoading,
    refetch: refetchTokenBalance,
  } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "balanceOf",
    args: [accountAddress], query: { enabled: canRead },
  });

  const {
    data: stakedBalance,
    isLoading: isStakedBalanceLoading,
    refetch: refetchStakedBalance,
  } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "stakedBalances",
    args: [accountAddress], query: { enabled: canRead },
  });

  const { data: isWhitelisted } = useReadContract({
    address: complianceAddress, abi: complianceABI, functionName: "isWhitelisted",
    args: [accountAddress], query: { enabled: canRead },
  });

  const { data: isAdminTD } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, accountAddress], query: { enabled: canRead },
  });

  const { data: isAdminCompliance } = useReadContract({
    address: complianceAddress, abi: complianceABI, functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, accountAddress], query: { enabled: canRead },
  });

  const { data: isAdminInterestManager } = useReadContract({
    address: interestManagerAddress, abi: interestManagerABI, functionName: "hasRole",
    args: [DEFAULT_ADMIN_ROLE, accountAddress], query: { enabled: canRead },
  });

  const isAdmin = (isAdminTD === true || isAdminCompliance === true || isAdminInterestManager === true);

  const walletLabel = useMemo(() => {
    if (!address) return "Not connected";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const handleSwitchNetwork = async () => {
    try {
      await switchChainAsync({ chainId: hardhat.id });
      toast.success("Switched to Hardhat Localhost network.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 sm:px-8 sm:py-10">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-24 left-[-8%] h-72 w-72 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-500/20" />
        <div className="absolute right-[-6%] top-12 h-80 w-80 rounded-full bg-emerald-200/30 blur-3xl dark:bg-emerald-400/15" />
      </div>

      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header */}
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
                Full-featured demo: deposits, staking, governance, compliance, and cross-chain bridge operations.
              </p>
            </div>
            <div className="flex items-center justify-start md:justify-end">
              <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <ConnectButton accountStatus="address" showBalance={false} chainStatus="name" />
              </div>
            </div>
          </div>
        </section>

        {/* Network warning */}
        {mounted && isConnected && !onSupportedChain ? (
          <Card className="border-amber-300/60 bg-amber-50/80 dark:border-amber-700/50 dark:bg-amber-900/20">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">Unsupported Network</p>
                  <p className="text-sm text-amber-800/80 dark:text-amber-300/80">Switch your wallet to Hardhat Localhost (Chain ID 31337).</p>
                </div>
              </div>
              <button type="button" onClick={handleSwitchNetwork}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-50 disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200 dark:hover:bg-amber-900"
                disabled={isSwitchingChain}>Switch Network</button>
            </CardContent>
          </Card>
        ) : null}

        {/* KYC warning */}
        {mounted && canRead && isWhitelisted === false ? (
          <Card className="border-red-300/60 bg-red-50/80 dark:border-red-700/50 dark:bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <CircleAlert className="mt-0.5 h-5 w-5 text-red-600 dark:text-red-400" />
                <div className="space-y-1">
                  <p className="font-semibold text-red-900 dark:text-red-200">Not KYC Whitelisted</p>
                  <p className="text-sm text-red-800/80 dark:text-red-300/80">Your address is not in the KYC whitelist. Most contract interactions will revert.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Stat cards */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2"><Wallet className="h-4 w-4" />Token Balance</CardDescription>
              <CardTitle className="text-2xl">{!mounted ? "0.0000 TDHK" : isTokenBalanceLoading && canRead ? "Loading..." : `${formatTokenAmount(tokenBalance as bigint)} TDHK`}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2"><PiggyBank className="h-4 w-4" />Staked Balance</CardDescription>
              <CardTitle className="text-2xl">{!mounted ? "0.0000 TDHK" : isStakedBalanceLoading && canRead ? "Loading..." : `${formatTokenAmount(stakedBalance as bigint)} TDHK`}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-2"><Activity className="h-4 w-4" />Session Status</CardDescription>
              <CardTitle className="text-2xl">{!mounted ? "Disconnected" : isConnected ? "Connected" : "Disconnected"}</CardTitle>
            </CardHeader>
          </Card>
        </section>

        {/* Account Snapshot */}
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
                  <TableCell className="font-mono text-xs sm:text-sm">{!mounted ? "Not connected" : walletLabel}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Network</TableCell>
                  <TableCell>{!mounted ? "Unknown" : onSupportedChain ? "Hardhat Localhost (31337)" : `Chain ID ${chainId ?? "Unknown"}`}</TableCell>
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

        {/* Tab navigation */}
        <Tabs active={activeTab} onChange={setActiveTab} isAdmin={isAdmin} />

        {/* Active section */}
        {activeTab === "dashboard" && (
          <DashboardSection tokenAddress={tokenAddress} tokenBalance={tokenBalance as bigint} stakedBalance={stakedBalance as bigint}
            canWrite={canWrite} refetchToken={refetchTokenBalance} refetchStaked={refetchStakedBalance} />
        )}
        {activeTab === "banking" && (
          <BankingSection tokenAddress={tokenAddress} accountAddress={accountAddress} canWrite={canWrite} refetchToken={refetchTokenBalance} />
        )}
        {activeTab === "compliance" && (
          <ComplianceSection complianceAddress={complianceAddress} accountAddress={accountAddress} canWrite={canWrite} />
        )}
        {activeTab === "admin" && (
          <AdminSection tokenAddress={tokenAddress} interestManagerAddress={interestManagerAddress} canWrite={canWrite} isAdmin={isAdmin} refetchToken={refetchTokenBalance} />
        )}
        {activeTab === "governance" && (
          <GovernanceSection accountAddress={accountAddress} canWrite={canWrite} />
        )}
        {activeTab === "validators" && (
          <ValidatorsSection tokenAddress={tokenAddress} />
        )}
        {activeTab === "bridge" && (
          <BridgeSection canWrite={canWrite} />
        )}
      </div>
    </main>
  );
}
