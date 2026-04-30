"use client";

import { useEffect, useState, useCallback } from "react";
import type { Address } from "viem";
import { formatEther, zeroAddress } from "viem";
import { useReadContract, usePublicClient } from "wagmi";
import { Landmark, Coins } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { tokenizedDepositABI } from "@/constants/abi";

type Props = {
  tokenAddress: Address;
};

type BankData = {
  address: Address;
  entryTime: bigint;
  contribution: bigint;
  feesGenerated: bigint;
  founder: boolean;
  share: bigint;
  claimable: bigint;
};

export function ValidatorsSection({ tokenAddress }: Props) {
  const [banks, setBanks] = useState<BankData[]>([]);
  const [loading, setLoading] = useState(true);
  const client = usePublicClient();

  const { data: accumulatedFeePerShare } = useReadContract({
    address: tokenAddress, abi: tokenizedDepositABI, functionName: "accumulatedFeePerShare",
  });

  const loadBanks = useCallback(async () => {
    if (!client) return;
    setLoading(true);
    const results: BankData[] = [];
    let index = 0;
    while (true) {
      try {
        const addr = await client.readContract({
          address: tokenAddress, abi: tokenizedDepositABI, functionName: "validators", args: [BigInt(index)],
        }) as Address;
        if (!addr || addr === zeroAddress) break;

        const [bankInfo, share, claimable] = await Promise.all([
          client.readContract({
            address: tokenAddress, abi: tokenizedDepositABI, functionName: "banks", args: [addr],
          }) as Promise<[bigint, bigint, bigint, boolean]>,
          client.readContract({
            address: tokenAddress, abi: tokenizedDepositABI, functionName: "validatorShares", args: [addr],
          }) as Promise<bigint>,
          client.readContract({
            address: tokenAddress, abi: tokenizedDepositABI, functionName: "claimableFees", args: [addr],
          }) as Promise<bigint>,
        ]);
        results.push({ address: addr, entryTime: bankInfo[0], contribution: bankInfo[1], feesGenerated: bankInfo[2], founder: bankInfo[3], share, claimable });
      } catch {
        break;
      }
      index++;
    }
    setBanks(results);
    setLoading(false);
  }, [client, tokenAddress]);

  useEffect(() => { loadBanks(); }, [loadBanks]);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Landmark className="h-4 w-4" />Total Banks</CardDescription>
            <CardTitle className="text-2xl">{loading ? "..." : banks.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Coins className="h-4 w-4" />Total Shares</CardDescription>
            <CardTitle className="text-2xl">{banks.length > 0 ? Number(formatEther(BigInt(banks.reduce((s, b) => s + Number(b.share), 0)))).toFixed(4) : "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2"><Coins className="h-4 w-4" />Accum. Fee / Share</CardDescription>
            <CardTitle className="text-2xl">{accumulatedFeePerShare !== undefined ? Number(formatEther(accumulatedFeePerShare as bigint)).toFixed(4) : "..."}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banks &amp; Validators</CardTitle>
          <CardDescription>All registered banks with their shares, contributions, and claimable fees.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500 py-8 text-center">Loading validators...</p>
          ) : banks.length === 0 ? (
            <p className="text-sm text-slate-500 py-8 text-center">No validators registered.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Address</TableHead>
                  <TableHead>Contribution</TableHead>
                  <TableHead>Share</TableHead>
                  <TableHead>Founder</TableHead>
                  <TableHead>Fees Generated</TableHead>
                  <TableHead>Claimable</TableHead>
                  <TableHead>Entry</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banks.map((b) => (
                  <TableRow key={b.address}>
                    <TableCell className="font-mono text-xs">{b.address.slice(0, 6)}...{b.address.slice(-4)}</TableCell>
                    <TableCell>{Number(formatEther(b.contribution)).toLocaleString()} TDHK</TableCell>
                    <TableCell>{Number(formatEther(b.share)).toFixed(4)}</TableCell>
                    <TableCell>{b.founder ? "Yes" : "No"}</TableCell>
                    <TableCell>{Number(formatEther(b.feesGenerated)).toFixed(4)} TDHK</TableCell>
                    <TableCell>{Number(formatEther(b.claimable)).toFixed(4)} TDHK</TableCell>
                    <TableCell className="text-xs">{new Date(Number(b.entryTime) * 1000).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
