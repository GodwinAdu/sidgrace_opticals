"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ReceiptItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ReceiptSale {
  saleNumber?: string;
  items?: ReceiptItem[];
  subTotal?: number;
  total?: number;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string;
  paymentReference?: string;
  amountTendered?: number;
  change?: number;
  authorizationNote?: string;
  createdAt?: string;
}

interface ReceiptProps {
  sale: ReceiptSale;
  clinicName: string;
  cashierName: string;
}

const money = (n: number | undefined) => (Number(n) || 0).toFixed(2);

const Receipt = ({ sale, clinicName, cashierName }: ReceiptProps) => {
  const items = sale?.items || [];
  const isCash = sale?.paymentMethod === "cash";
  const when = sale?.createdAt ? new Date(sale.createdAt) : new Date();
  const [printing, setPrinting] = useState(false);

  /**
   * Print to the networked thermal printer (ESC/POS) via the server. Falls back
   * to the browser print dialog if the printer is unreachable, so the cashier
   * always gets a receipt one way or another.
   */
  const printToThermal = async () => {
    setPrinting(true);
    const t = toast.loading("Printing receipt…");
    try {
      const payload = {
        clinicName,
        title: "PHARMACY RECEIPT",
        docNumber: sale?.saleNumber,
        dateText: when.toLocaleString(),
        customerName: sale?.customerName,
        cashierName,
        lines: items.map((it) => ({
          name: it.name,
          detail: `${it.quantity} x ${money(it.unitPrice)}`,
          amount: money(it.total),
        })),
        totals: [
          { label: "Subtotal", value: money(sale?.subTotal) },
          { label: "TOTAL", value: money(sale?.total), bold: true },
          { label: "Payment", value: (sale?.paymentMethod || "").replace("-", " ") },
          ...(sale?.paymentReference ? [{ label: "Reference", value: sale.paymentReference }] : []),
          ...(isCash ? [
            { label: "Tendered", value: money(sale?.amountTendered) },
            { label: "Change", value: money(sale?.change) },
          ] : []),
        ],
        footer: "Thank you.",
        width: 48,
      };
      const res = await fetch("/api/print-receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json().catch(() => ({ ok: false }));
      if (res.ok && result.ok) {
        toast.success("Receipt printed", { id: t });
      } else {
        toast.error("Printer unreachable — using browser print", {
          id: t,
          description: result?.error,
        });
        window.print();
      }
    } catch (err) {
      toast.error("Printer error — using browser print", {
        id: t,
        description: err instanceof Error ? err.message : undefined,
      });
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div>
      <div id="pos-receipt" className="text-sm font-mono text-black">
        <div className="text-center mb-2">
          <p className="font-bold text-base">{clinicName}</p>
          <p className="text-xs">Pharmacy Sale Receipt</p>
        </div>

        <div className="text-xs space-y-0.5 mb-2">
          <div className="flex justify-between">
            <span>Sale No:</span>
            <span>{sale?.saleNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Date:</span>
            <span>{when.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>{cashierName}</span>
          </div>
          {sale?.customerName ? (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{sale.customerName}</span>
            </div>
          ) : null}
          {sale?.customerPhone ? (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{sale.customerPhone}</span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-b border-dashed border-black py-1 my-1">
          <div className="flex text-xs font-semibold">
            <span className="flex-1">Item</span>
            <span className="w-10 text-right">Qty</span>
            <span className="w-16 text-right">Unit</span>
            <span className="w-16 text-right">Total</span>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="flex text-xs py-0.5">
              <span className="flex-1 truncate pr-1">{item.name}</span>
              <span className="w-10 text-right">{item.quantity}</span>
              <span className="w-16 text-right">{money(item.unitPrice)}</span>
              <span className="w-16 text-right">{money(item.total)}</span>
            </div>
          ))}
        </div>

        <div className="text-xs space-y-0.5 mt-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{money(sale?.subTotal)}</span>
          </div>
          <div className="flex justify-between font-bold text-sm">
            <span>Total</span>
            <span>{money(sale?.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>Payment</span>
            <span className="capitalize">{(sale?.paymentMethod || "").replace("-", " ")}</span>
          </div>
          {sale?.paymentReference ? (
            <div className="flex justify-between">
              <span>Reference</span>
              <span>{sale.paymentReference}</span>
            </div>
          ) : null}
          {isCash ? (
            <>
              <div className="flex justify-between">
                <span>Tendered</span>
                <span>{money(sale?.amountTendered)}</span>
              </div>
              <div className="flex justify-between">
                <span>Change</span>
                <span>{money(sale?.change)}</span>
              </div>
            </>
          ) : null}
        </div>

        {sale?.authorizationNote ? (
          <div className="text-xs mt-2 border-t border-dashed border-black pt-1">
            <p className="font-semibold">Authorization</p>
            <p className="whitespace-pre-wrap">{sale.authorizationNote}</p>
          </div>
        ) : null}

        <p className="text-center text-xs mt-3">Thank you.</p>
      </div>

      <div className="mt-4 flex justify-end gap-2 print:hidden">
        <Button variant="outline" onClick={() => window.print()}>Browser Print</Button>
        <Button onClick={printToThermal} disabled={printing}>
          {printing ? "Printing…" : "Print Receipt"}
        </Button>
      </div>
    </div>
  );
};

export default Receipt;
