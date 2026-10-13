"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import {
    Loader2,
    PlusCircle,
    Trash2,
    ClipboardList,
    ShoppingCart,
    PackageCheck,
    X,
} from "lucide-react";
import { format } from "date-fns";
import {
    createRequisition,
    updateRequisitionStatus,
    deleteRequisition,
    createPurchaseOrder,
    updatePurchaseOrderStatus,
    deletePurchaseOrder,
    receiveGrn,
} from "@/lib/actions/procurement.actions";
import {
    REQUISITION_STATUSES,
    PURCHASE_ORDER_STATUSES,
    nextRequisitionStatuses,
    nextPurchaseOrderStatuses,
    canIssuePurchaseOrder,
    type RequisitionStatus,
    type PurchaseOrderStatus,
} from "@/lib/clinical/procurement";

/* ─────────────────────────────── Types (lite) ───────────────────────────── */

interface ProductLite { _id: string; name?: string; unit?: string; purchasePrice?: number }
interface SupplierLite { _id: string; name?: string }

interface PopulatedProduct { _id?: string; name?: string; unit?: string }
type ProductRef = PopulatedProduct | string | null | undefined;

interface RequisitionRow {
    _id: string;
    requisitionNumber?: string;
    title?: string;
    department?: string;
    items?: { productId?: ProductRef; quantity?: number; note?: string }[];
    status?: RequisitionStatus;
    reason?: string;
    note?: string;
    createdAt?: string;
}

interface PurchaseOrderRow {
    _id: string;
    poNumber?: string;
    requisitionId?: { _id?: string; requisitionNumber?: string } | string | null;
    supplierId?: { _id?: string; name?: string } | string | null;
    items?: { productId?: ProductRef; quantity?: number; unitPrice?: number }[];
    total?: number;
    status?: PurchaseOrderStatus;
    createdAt?: string;
}

interface GrnRow {
    _id: string;
    grnNumber?: string;
    purchaseOrderId?: { _id?: string; poNumber?: string } | string | null;
    supplierId?: { _id?: string; name?: string } | string | null;
    items?: { productId?: ProductRef; orderedQuantity?: number; receivedQuantity?: number; variance?: number }[];
    note?: string;
    createdAt?: string;
}

interface Props {
    requisitions: RequisitionRow[];
    purchaseOrders: PurchaseOrderRow[];
    grns: GrnRow[];
    suppliers: SupplierLite[];
    products: ProductLite[];
}

/* ─────────────────────────────── Helpers ────────────────────────────────── */

const prodName = (p: ProductRef) => (typeof p === "object" && p ? p.name || "" : "");
const refNumber = (r: PurchaseOrderRow["requisitionId"]) =>
    typeof r === "object" && r ? r.requisitionNumber || "" : "";
const supName = (s: PurchaseOrderRow["supplierId"]) =>
    typeof s === "object" && s ? s.name || "" : "";
const poNumberOf = (p: GrnRow["purchaseOrderId"]) =>
    typeof p === "object" && p ? p.poNumber || "" : "";

const statusTone = (status?: string) => {
    switch (status) {
        case "approved":
        case "ordered":
            return "bg-sky-100 text-sky-800 border-sky-200";
        case "received":
            return "bg-emerald-100 text-emerald-800 border-emerald-200";
        case "rejected":
        case "cancelled":
            return "bg-red-100 text-red-800 border-red-200";
        case "submitted":
            return "bg-indigo-100 text-indigo-800 border-indigo-200";
        default:
            return "bg-amber-100 text-amber-800 border-amber-200";
    }
};

const reqStatusLabel = (v?: string) => REQUISITION_STATUSES.find((s) => s.value === v)?.label ?? v ?? "";
const poStatusLabel = (v?: string) => PURCHASE_ORDER_STATUSES.find((s) => s.value === v)?.label ?? v ?? "";

/* ────────────────────────────── Component ───────────────────────────────── */

export function ProcurementManager({ requisitions, purchaseOrders, grns, suppliers, products }: Props) {
    const router = useRouter();
    const path = usePathname();

    const [tab, setTab] = useState<"requisitions" | "orders" | "grns">("requisitions");
    const [busyId, setBusyId] = useState<string | null>(null);

    // ── Requisition form ──
    const [title, setTitle] = useState("");
    const [department, setDepartment] = useState("");
    const [reason, setReason] = useState("");
    const [lines, setLines] = useState<{ productId: string; quantity: number }[]>([{ productId: "", quantity: 1 }]);
    const [creatingReq, setCreatingReq] = useState(false);

    // ── PO issue form ──
    const [poReqId, setPoReqId] = useState("");
    const [poSupplierId, setPoSupplierId] = useState("");
    const [issuingPo, setIssuingPo] = useState(false);

    const approvedRequisitions = useMemo(
        () => requisitions.filter((r) => canIssuePurchaseOrder((r.status as RequisitionStatus) ?? "draft")),
        [requisitions],
    );

    const addLine = () => setLines((l) => [...l, { productId: "", quantity: 1 }]);
    const removeLine = (idx: number) => setLines((l) => l.filter((_, i) => i !== idx));
    const setLine = (idx: number, patch: Partial<{ productId: string; quantity: number }>) =>
        setLines((l) => l.map((x, i) => (i === idx ? { ...x, ...patch } : x)));

    const resetReqForm = () => {
        setTitle(""); setDepartment(""); setReason("");
        setLines([{ productId: "", quantity: 1 }]);
    };

    const doCreateRequisition = async () => {
        const items = lines.filter((l) => l.productId && Number(l.quantity) > 0);
        if (items.length === 0) return toast.error("Add at least one product line");
        try {
            setCreatingReq(true);
            await createRequisition({ title, department, reason, items }, path);
            toast.success("Requisition raised");
            resetReqForm();
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setCreatingReq(false);
        }
    };

    const changeReqStatus = async (r: RequisitionRow, to: RequisitionStatus) => {
        try {
            setBusyId(r._id);
            await updateRequisitionStatus(r._id, to, "", path);
            toast.success(`Requisition ${reqStatusLabel(to).toLowerCase()}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const removeRequisition = async (id: string) => {
        try {
            setBusyId(id);
            await deleteRequisition(id);
            toast.success("Requisition removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doIssuePo = async () => {
        if (!poReqId) return toast.error("Select an approved requisition");
        if (!poSupplierId) return toast.error("Select a supplier");
        try {
            setIssuingPo(true);
            await createPurchaseOrder({ requisitionId: poReqId, supplierId: poSupplierId }, path);
            toast.success("Purchase order raised");
            setPoReqId(""); setPoSupplierId("");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setIssuingPo(false);
        }
    };

    const changePoStatus = async (p: PurchaseOrderRow, to: PurchaseOrderStatus) => {
        try {
            setBusyId(p._id);
            await updatePurchaseOrderStatus(p._id, to, path);
            toast.success(`Purchase order ${poStatusLabel(to).toLowerCase()}`);
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const removePo = async (id: string) => {
        try {
            setBusyId(id);
            await deletePurchaseOrder(id);
            toast.success("Purchase order removed");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const doReceive = async (p: PurchaseOrderRow) => {
        try {
            setBusyId(p._id);
            await receiveGrn({ purchaseOrderId: p._id }, path);
            toast.success("Goods received, stock updated");
            router.refresh();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                <Button variant={tab === "requisitions" ? "default" : "outline"} size="sm" onClick={() => setTab("requisitions")}>
                    <ClipboardList className="mr-2 h-4 w-4" /> Requisitions
                </Button>
                <Button variant={tab === "orders" ? "default" : "outline"} size="sm" onClick={() => setTab("orders")}>
                    <ShoppingCart className="mr-2 h-4 w-4" /> Purchase Orders
                </Button>
                <Button variant={tab === "grns" ? "default" : "outline"} size="sm" onClick={() => setTab("grns")}>
                    <PackageCheck className="mr-2 h-4 w-4" /> Goods Received
                </Button>
            </div>

            {/* ─── Requisitions ─── */}
            {tab === "requisitions" && (
                <>
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Raise Requisition</h3>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                                    <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Monthly consumables" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Department</label>
                                    <Input value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Pharmacy" />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Reason (optional)</label>
                                    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this needed?" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs text-muted-foreground">Items</label>
                                {lines.map((l, idx) => (
                                    <div key={idx} className="flex items-end gap-2">
                                        <div className="flex-1">
                                            <Select value={l.productId} onValueChange={(v) => setLine(idx, { productId: v })}>
                                                <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                                                <SelectContent>
                                                    {products.map((p) => (
                                                        <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-28">
                                            <Input
                                                type="number"
                                                min={1}
                                                value={l.quantity}
                                                onChange={(e) => setLine(idx, { quantity: Number(e.target.value) })}
                                            />
                                        </div>
                                        {lines.length > 1 && (
                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add line
                                </Button>
                            </div>

                            <div className="flex justify-end">
                                <Button onClick={doCreateRequisition} disabled={creatingReq}>
                                    {creatingReq ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                    Raise Requisition
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Requisitions</h3>
                        {(!requisitions || requisitions.length === 0) && (
                            <p className="text-sm text-muted-foreground">No requisitions yet.</p>
                        )}
                        {requisitions.map((r) => {
                            const nexts = nextRequisitionStatuses((r.status as RequisitionStatus) ?? "draft");
                            return (
                                <Card key={r._id}>
                                    <CardContent className="pt-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">
                                                    {r.title || "Requisition"}
                                                    <span className="ml-2 text-xs font-normal text-muted-foreground">{r.requisitionNumber}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {r.department ? r.department : ""}
                                                    {r.createdAt ? ` · ${format(new Date(r.createdAt), "PP")}` : ""}
                                                </p>
                                                <ul className="mt-1 text-sm">
                                                    {(r.items || []).map((it, i) => (
                                                        <li key={i} className="text-muted-foreground">
                                                            {prodName(it.productId) || "Product"} × {it.quantity}
                                                        </li>
                                                    ))}
                                                </ul>
                                                {r.reason && <p className="mt-1 text-xs text-muted-foreground">{r.reason}</p>}
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <Badge variant="outline" className={statusTone(r.status)}>{reqStatusLabel(r.status)}</Badge>
                                                {nexts.map((to) => (
                                                    <Button
                                                        key={to}
                                                        size="sm"
                                                        variant={to === "rejected" ? "ghost" : "outline"}
                                                        onClick={() => changeReqStatus(r, to)}
                                                        disabled={busyId === r._id}
                                                    >
                                                        {busyId === r._id ? <Loader2 className="h-4 w-4 animate-spin" /> : reqStatusLabel(to)}
                                                    </Button>
                                                ))}
                                                <button onClick={() => removeRequisition(r._id)} disabled={busyId === r._id} className="text-muted-foreground hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ─── Purchase Orders ─── */}
            {tab === "orders" && (
                <>
                    <Card>
                        <CardContent className="space-y-4 pt-6">
                            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Issue Purchase Order</h3>
                            <p className="text-xs text-muted-foreground">A purchase order can only be raised from an approved requisition.</p>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Approved requisition</label>
                                    <Select value={poReqId} onValueChange={setPoReqId}>
                                        <SelectTrigger><SelectValue placeholder="Select requisition" /></SelectTrigger>
                                        <SelectContent>
                                            {approvedRequisitions.length === 0 ? (
                                                <SelectItem value="none" disabled>No approved requisitions</SelectItem>
                                            ) : (
                                                approvedRequisitions.map((r) => (
                                                    <SelectItem key={r._id} value={r._id}>
                                                        {r.requisitionNumber} {r.title ? `— ${r.title}` : ""}
                                                    </SelectItem>
                                                ))
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs text-muted-foreground">Supplier</label>
                                    <Select value={poSupplierId} onValueChange={setPoSupplierId}>
                                        <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <Button onClick={doIssuePo} disabled={issuingPo}>
                                    {issuingPo ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                                    Issue Purchase Order
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Purchase Orders</h3>
                        {(!purchaseOrders || purchaseOrders.length === 0) && (
                            <p className="text-sm text-muted-foreground">No purchase orders yet.</p>
                        )}
                        {purchaseOrders.map((p) => {
                            const nexts = nextPurchaseOrderStatuses((p.status as PurchaseOrderStatus) ?? "draft")
                                .filter((s) => s !== "received"); // receipt is via the Receive button
                            return (
                                <Card key={p._id}>
                                    <CardContent className="pt-5">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">
                                                    {supName(p.supplierId) || "Supplier"}
                                                    <span className="ml-2 text-xs font-normal text-muted-foreground">{p.poNumber}</span>
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    from {refNumber(p.requisitionId) || "requisition"}
                                                    {p.createdAt ? ` · ${format(new Date(p.createdAt), "PP")}` : ""}
                                                    {typeof p.total === "number" ? ` · Total ${p.total.toFixed(2)}` : ""}
                                                </p>
                                                <ul className="mt-1 text-sm">
                                                    {(p.items || []).map((it, i) => (
                                                        <li key={i} className="text-muted-foreground">
                                                            {prodName(it.productId) || "Product"} × {it.quantity}
                                                            {typeof it.unitPrice === "number" ? ` @ ${it.unitPrice.toFixed(2)}` : ""}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <Badge variant="outline" className={statusTone(p.status)}>{poStatusLabel(p.status)}</Badge>
                                                {nexts.map((to) => (
                                                    <Button
                                                        key={to}
                                                        size="sm"
                                                        variant={to === "cancelled" ? "ghost" : "outline"}
                                                        onClick={() => changePoStatus(p, to)}
                                                        disabled={busyId === p._id}
                                                    >
                                                        {busyId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : poStatusLabel(to)}
                                                    </Button>
                                                ))}
                                                {p.status === "ordered" && (
                                                    <Button size="sm" onClick={() => doReceive(p)} disabled={busyId === p._id}>
                                                        {busyId === p._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageCheck className="mr-1 h-4 w-4" /> Receive</>}
                                                    </Button>
                                                )}
                                                <button onClick={() => removePo(p._id)} disabled={busyId === p._id} className="text-muted-foreground hover:text-red-600">
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ─── GRNs ─── */}
            {tab === "grns" && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Goods Received Notes</h3>
                    {(!grns || grns.length === 0) && (
                        <p className="text-sm text-muted-foreground">No goods received yet.</p>
                    )}
                    {grns.map((g) => (
                        <Card key={g._id}>
                            <CardContent className="pt-5">
                                <p className="font-semibold">
                                    {g.grnNumber}
                                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                                        {poNumberOf(g.purchaseOrderId) || "PO"} · {supName(g.supplierId) || "Supplier"}
                                        {g.createdAt ? ` · ${format(new Date(g.createdAt), "PP")}` : ""}
                                    </span>
                                </p>
                                <ul className="mt-1 text-sm">
                                    {(g.items || []).map((it, i) => (
                                        <li key={i} className="flex items-center gap-2 text-muted-foreground">
                                            {prodName(it.productId) || "Product"}: received {it.receivedQuantity} / ordered {it.orderedQuantity}
                                            {typeof it.variance === "number" && it.variance !== 0 && (
                                                <Badge variant="outline" className={it.variance < 0 ? "bg-red-100 text-red-800 border-red-200" : "bg-amber-100 text-amber-800 border-amber-200"}>
                                                    {it.variance > 0 ? `+${it.variance} over` : `${it.variance} short`}
                                                </Badge>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                {g.note && <p className="mt-1 text-xs text-muted-foreground">{g.note}</p>}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
