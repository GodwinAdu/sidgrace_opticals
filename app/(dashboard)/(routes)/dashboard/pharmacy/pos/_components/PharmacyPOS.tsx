"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, X, Search, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { createPharmacySale } from "@/lib/actions/pharmacy-sale.actions";
import { fetchPatientBySearch } from "@/lib/actions/patient.actions";
import {
  POS_PAYMENT_METHODS,
  type PosCartLine,
  type PosPaymentMethod,
  computeChange,
  requiresAuthNote,
} from "@/lib/constants/pharmacy-pos";
import Receipt from "./Receipt";

interface PharmacyProduct {
  _id: string;
  name: string;
  genericName?: string;
  barcode?: string;
  strength?: string;
  form?: string;
  salePrice?: number;
  quantity?: number;
  prescriptionRequired?: boolean;
  controlledSubstance?: boolean;
}

interface AttachedPatient {
  _id: string;
  fullName?: string;
  patientId?: string;
}

interface PharmacyPOSProps {
  products: PharmacyProduct[];
  clinicName: string;
  cashierName: string;
}

const money = (n: number) => (Number(n) || 0).toFixed(2);

const PharmacyPOS = ({ products, clinicName, cashierName }: PharmacyPOSProps) => {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<PosCartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountTendered, setAmountTendered] = useState("");
  const [authorizationNote, setAuthorizationNote] = useState("");
  const [attachedPatient, setAttachedPatient] = useState<AttachedPatient | null>(null);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientResults, setPatientResults] = useState<AttachedPatient[]>([]);
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Receipt dialog
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [completedSale, setCompletedSale] = useState<unknown>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.genericName || "").toLowerCase().includes(q) ||
        (p.barcode || "").toLowerCase().includes(q)
      );
    });
  }, [products, search]);

  const subTotal = cart.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const total = subTotal;
  const authNoteNeeded = requiresAuthNote(cart);
  const change = computeChange(Number(amountTendered) || 0, total);
  const cashUnderpaid = paymentMethod === "cash" && (Number(amountTendered) || 0) < total;
  const stockExceeded = cart.some((line) => line.quantity > line.available);

  const addToCart = (product: PharmacyProduct) => {
    const available = Number(product.quantity) || 0;
    if (available <= 0) {
      toast.warning(`${product.name} is out of stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product._id);
      if (existing) {
        if (existing.quantity >= available) {
          toast.warning(`Only ${available} in stock`);
          return prev;
        }
        return prev.map((l) =>
          l.productId === product._id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          genericName: product.genericName,
          unitPrice: Number(product.salePrice) || 0,
          quantity: 1,
          available,
          prescriptionRequired: product.prescriptionRequired === true,
          controlledSubstance: product.controlledSubstance === true,
        },
      ];
    });
  };

  const setQty = (productId: string, qty: number) => {
    setCart((prev) =>
      prev.flatMap((line) => {
        if (line.productId !== productId) return [line];
        if (qty <= 0) return [];
        if (qty > line.available) {
          toast.warning(`Only ${line.available} in stock`);
          return [{ ...line, quantity: line.available }];
        }
        return [{ ...line, quantity: qty }];
      }),
    );
  };

  const removeLine = (productId: string) => {
    setCart((prev) => prev.filter((l) => l.productId !== productId));
  };

  const runPatientSearch = async (value: string) => {
    setPatientSearch(value);
    if (value.trim().length < 2) {
      setPatientResults([]);
      return;
    }
    try {
      const results = await fetchPatientBySearch(value.trim());
      setPatientResults(Array.isArray(results) ? results : []);
    } catch {
      setPatientResults([]);
    }
  };

  const resetSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setAmountTendered("");
    setAuthorizationNote("");
    setAttachedPatient(null);
    setPatientSearch("");
    setPatientResults([]);
  };

  const completeDisabled =
    submitting ||
    cart.length === 0 ||
    stockExceeded ||
    cashUnderpaid ||
    (authNoteNeeded && authorizationNote.trim().length === 0);

  const handleComplete = async () => {
    if (completeDisabled) return;
    setSubmitting(true);
    try {
      const sale = await createPharmacySale({
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        customerName,
        customerPhone,
        patientId: attachedPatient?._id || null,
        paymentMethod,
        paymentReference,
        amountTendered: Number(amountTendered) || 0,
        authorizationNote,
      });
      toast.success(`Sale ${sale?.saleNumber || ""} completed`);
      setCompletedSale(sale);
      setReceiptOpen(true);
      resetSale();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete the sale");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      {/* Left — product catalog */}
      <Card>
        <CardHeader>
          <CardTitle>Drugs</CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by name, generic or barcode"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[60vh] pr-2">
            <div className="grid sm:grid-cols-2 gap-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full py-8 text-center">
                  No drugs found.
                </p>
              ) : (
                filtered.map((product) => {
                  const available = Number(product.quantity) || 0;
                  const out = available <= 0;
                  return (
                    <button
                      key={product._id}
                      type="button"
                      disabled={out}
                      onClick={() => addToCart(product)}
                      className="text-left rounded-md border p-3 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm">{product.name}</span>
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {money(Number(product.salePrice) || 0)}
                        </span>
                      </div>
                      {(product.strength || product.form) && (
                        <p className="text-xs text-muted-foreground">
                          {[product.strength, product.form].filter(Boolean).join(" · ")}
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-1 mt-2">
                        <span className="text-xs text-muted-foreground mr-1">
                          On hand: {available}
                        </span>
                        {product.prescriptionRequired && (
                          <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Rx</Badge>
                        )}
                        {product.controlledSubstance && (
                          <Badge variant="destructive">Controlled</Badge>
                        )}
                        {out && <Badge variant="outline">Out of stock</Badge>}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right — cart & checkout */}
      <Card>
        <CardHeader>
          <CardTitle>Cart</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cart.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Cart is empty
                  </TableCell>
                </TableRow>
              ) : (
                cart.map((line) => (
                  <TableRow key={line.productId}>
                    <TableCell className="max-w-[120px]">
                      <span className="block truncate text-sm">{line.name}</span>
                      <span className="text-xs text-muted-foreground">{money(line.unitPrice)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={() => setQty(line.productId, line.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          className="h-6 w-12 text-center px-1"
                          value={line.quantity}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setQty(line.productId, Number.isNaN(v) ? 0 : v);
                          }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-6 w-6"
                          onClick={() => setQty(line.productId, line.quantity + 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {money(line.unitPrice * line.quantity)}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeLine(line.productId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Separator />

          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          {/* Customer */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Customer name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          {/* Optional patient attach */}
          <div className="space-y-1">
            <Label className="text-xs">Patient (optional)</Label>
            {attachedPatient ? (
              <div className="flex items-center justify-between rounded-md border px-2 py-1.5">
                <span className="text-sm">
                  {attachedPatient.fullName || "Patient"}
                  {attachedPatient.patientId ? ` (${attachedPatient.patientId})` : ""}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setAttachedPatient(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-start">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Attach patient
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-2" align="start">
                  <Input
                    placeholder="Search patient"
                    value={patientSearch}
                    onChange={(e) => runPatientSearch(e.target.value)}
                  />
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    {patientResults.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-1 py-2">
                        Type at least 2 characters.
                      </p>
                    ) : (
                      patientResults.map((p) => (
                        <button
                          key={p._id}
                          type="button"
                          className="w-full text-left text-sm rounded px-2 py-1.5 hover:bg-muted"
                          onClick={() => {
                            setAttachedPatient(p);
                            setPatientPopoverOpen(false);
                            setPatientSearch("");
                            setPatientResults([]);
                          }}
                        >
                          {p.fullName || "Patient"}
                          {p.patientId ? ` (${p.patientId})` : ""}
                        </button>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Payment */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Payment method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PosPaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POS_PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Reference (optional)</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          {paymentMethod === "cash" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Amount tendered</Label>
                <Input
                  inputMode="decimal"
                  value={amountTendered}
                  onChange={(e) => setAmountTendered(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Change</Label>
                <div className="h-9 flex items-center px-3 rounded-md border bg-muted text-sm">
                  {money(change)}
                </div>
              </div>
            </div>
          )}

          {authNoteNeeded && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Authorization / prescriber note</Label>
                <Badge variant="destructive">Required</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                The cart contains prescription or controlled items. A note is required.
              </p>
              <Textarea
                value={authorizationNote}
                onChange={(e) => setAuthorizationNote(e.target.value)}
                rows={2}
              />
            </div>
          )}

          <Button className="w-full" disabled={completeDisabled} onClick={handleComplete}>
            {submitting ? "Processing..." : "Complete Sale"}
          </Button>
        </CardContent>
      </Card>

      {/* Receipt dialog */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sale Receipt</DialogTitle>
          </DialogHeader>
          {completedSale ? (
            <Receipt
              sale={completedSale as never}
              clinicName={clinicName}
              cashierName={cashierName}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PharmacyPOS;
