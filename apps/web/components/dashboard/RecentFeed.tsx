"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecentTransaction } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@octapos/shared-utils";

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai",
  qris: "QRIS",
  edc_debit: "Debit",
  edc_credit: "Kredit",
  transfer: "Transfer",
  split: "Split",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

interface Props {
  tenantId: string;
  initial: RecentTransaction[];
}

export default function RecentFeed({ tenantId, initial }: Props) {
  const [transactions, setTransactions] = useState<RecentTransaction[]>(initial);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("recent-transactions")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
          filter: `tenant_id=eq.${tenantId}`,
        },
        (payload) => {
          const row = payload.new as RecentTransaction;
          setTransactions((prev) =>
            [{ ...row, totalFormatted: formatCurrency(row.total) }, ...prev].slice(0, 20)
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          Transaksi Terbaru
          <span className="inline-block h-2 w-2 rounded-full bg-green-500 animate-pulse" title="Live" />
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">Belum ada transaksi hari ini.</p>
        ) : (
          <div className="max-h-[320px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="px-6 py-2 text-left font-medium">No. Invoice</th>
                  <th className="px-4 py-2 text-left font-medium">Metode</th>
                  <th className="px-4 py-2 text-left font-medium">Status</th>
                  <th className="px-6 py-2 text-right font-medium">Total</th>
                  <th className="px-4 py-2 text-right font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="px-6 py-2.5 font-mono text-xs">{tx.invoice_no}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {METHOD_LABEL[tx.payment_method] ?? tx.payment_method}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={tx.status === "paid" ? "success" : "secondary"}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-2.5 text-right font-mono font-semibold">
                      {tx.totalFormatted}
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                      {formatTime(tx.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
