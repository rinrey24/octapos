import { Printer, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDateTime } from "@octapos/shared-utils";
import type { Transaction, TransactionItem } from "@octapos/shared-types";

interface ReceiptModalProps {
  open: boolean;
  transaction: Transaction;
  items: TransactionItem[];
  outletName: string;
  cashierName: string;
  onClose: () => void;
}

const METHOD_LABEL: Record<string, string> = {
  cash: "Tunai", qris: "QRIS", edc_debit: "Debit",
  edc_credit: "Kredit", transfer: "Transfer", split: "Campuran",
};

export function ReceiptModal({ open, transaction, items, outletName, cashierName, onClose }: ReceiptModalProps) {
  function handlePrint() {
    window.print();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Struk Transaksi</DialogTitle>
        </DialogHeader>

        {/* Receipt area */}
        <div id="receipt-content" className="font-mono text-sm space-y-1 border rounded-lg p-4 bg-white">
          <p className="text-center font-bold text-base">{outletName}</p>
          <Separator />
          <div className="flex justify-between text-xs">
            <span>No: {transaction.invoice_no}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span>Kasir: {cashierName}</span>
            <span>{formatDateTime(transaction.created_at)}</span>
          </div>
          <Separator />

          {items.map((item) => (
            <div key={item.id}>
              <p className="text-xs">{item.product_name_snapshot}</p>
              <div className="flex justify-between text-xs pl-2">
                <span>{formatCurrency(item.price_snapshot)} × {item.quantity}</span>
                <span>{formatCurrency(item.subtotal)}</span>
              </div>
            </div>
          ))}

          <Separator />

          {transaction.discount_total > 0 && (
            <div className="flex justify-between text-xs">
              <span>Diskon</span>
              <span>-{formatCurrency(transaction.discount_total)}</span>
            </div>
          )}
          {transaction.tax_total > 0 && (
            <div className="flex justify-between text-xs">
              <span>Pajak</span>
              <span>{formatCurrency(transaction.tax_total)}</span>
            </div>
          )}

          <div className="flex justify-between font-bold">
            <span>TOTAL</span>
            <span>{formatCurrency(transaction.total)}</span>
          </div>

          <div className="flex justify-between text-xs">
            <span>{METHOD_LABEL[transaction.payment_method] ?? transaction.payment_method}</span>
            <span>{formatCurrency(transaction.paid_amount)}</span>
          </div>

          {transaction.change_amount > 0 && (
            <div className="flex justify-between text-xs">
              <span>Kembalian</span>
              <span>{formatCurrency(transaction.change_amount)}</span>
            </div>
          )}

          <Separator />
          <p className="text-center text-xs">Terima kasih!</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Tutup
          </Button>
          <Button className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" /> Cetak
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
