"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Ban, CheckCircle2, Trash2, Building2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    createVendor,
    updateVendor,
    deactivateVendor,
    setVendorActive,
    deleteVendor,
} from "@/lib/actions/accounting/vendor.actions";

interface VendorRow {
    _id: string;
    name: string;
    contactName?: string;
    email?: string;
    phone?: string;
    address?: string;
    taxId?: string;
    paymentTerms?: string;
    payableAccountId?: string | { _id?: string } | null;
    isActive: boolean;
}

interface AccountOption {
    _id: string;
    code: string;
    name: string;
    type: string;
}

const EMPTY_FORM = {
    name: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    taxId: "",
    paymentTerms: "",
    payableAccountId: "",
};

const NONE = "__none__";

export default function VendorManager({
    vendors: initial,
    accounts,
}: {
    vendors: VendorRow[];
    accounts: AccountOption[];
}) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();

    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<VendorRow | null>(null);
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [busyId, setBusyId] = useState<string | null>(null);

    // Liability accounts make the most sense as default payable accounts.
    const payableAccounts = accounts.filter((a) => a.type === "liability");

    const openCreate = () => {
        setEditing(null);
        setForm({ ...EMPTY_FORM });
        setOpen(true);
    };

    const openEdit = (v: VendorRow) => {
        setEditing(v);
        const payId =
            v.payableAccountId && typeof v.payableAccountId === "object"
                ? v.payableAccountId._id || ""
                : (v.payableAccountId as string) || "";
        setForm({
            name: v.name || "",
            contactName: v.contactName || "",
            email: v.email || "",
            phone: v.phone || "",
            address: v.address || "",
            taxId: v.taxId || "",
            paymentTerms: v.paymentTerms || "",
            payableAccountId: payId,
        });
        setOpen(true);
    };

    const set = (key: keyof typeof form, value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    const save = () => {
        if (!form.name.trim()) {
            toast.error("A vendor name is required");
            return;
        }
        startTransition(async () => {
            try {
                const payload = {
                    name: form.name.trim(),
                    contactName: form.contactName.trim(),
                    email: form.email.trim(),
                    phone: form.phone.trim(),
                    address: form.address.trim(),
                    taxId: form.taxId.trim(),
                    paymentTerms: form.paymentTerms.trim(),
                    payableAccountId: form.payableAccountId || null,
                };
                if (editing?._id) {
                    await updateVendor(editing._id, payload, path);
                    toast.success("Vendor updated");
                } else {
                    await createVendor(payload, path);
                    toast.success("Vendor created");
                }
                setOpen(false);
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Something went wrong");
            }
        });
    };

    const toggleActive = (v: VendorRow) => {
        setBusyId(v._id);
        startTransition(async () => {
            try {
                if (v.isActive) {
                    await deactivateVendor(v._id, path);
                    toast.success("Vendor deactivated");
                } else {
                    await setVendorActive(v._id, true, path);
                    toast.success("Vendor activated");
                }
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Something went wrong");
            } finally {
                setBusyId(null);
            }
        });
    };

    const remove = (v: VendorRow) => {
        setBusyId(v._id);
        startTransition(async () => {
            try {
                await deleteVendor(v._id, path);
                toast.success("Vendor deleted");
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Vendor cannot be deleted");
            } finally {
                setBusyId(null);
            }
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Vendors
                </h3>
                <Button onClick={openCreate} size="sm">
                    <Plus className="mr-2 h-4 w-4" /> New Vendor
                </Button>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {!initial || initial.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
                            <Building2 className="h-8 w-8" />
                            <p className="text-sm">No vendors yet. Create one to start tracking payables and spend.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Terms</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initial.map((v) => (
                                    <TableRow key={v._id}>
                                        <TableCell>
                                            <div className="font-medium">{v.name}</div>
                                            {v.email ? (
                                                <div className="text-xs text-muted-foreground">{v.email}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {v.contactName || "—"}
                                            {v.phone ? (
                                                <div className="text-xs text-muted-foreground">{v.phone}</div>
                                            ) : null}
                                        </TableCell>
                                        <TableCell className="text-sm">{v.paymentTerms || "—"}</TableCell>
                                        <TableCell>
                                            <Badge variant={v.isActive ? "default" : "secondary"}>
                                                {v.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(v)}
                                                    disabled={isPending}
                                                    title="Edit"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => toggleActive(v)}
                                                    disabled={isPending && busyId === v._id}
                                                    title={v.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {busyId === v._id && isPending ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : v.isActive ? (
                                                        <Ban className="h-4 w-4 text-amber-600" />
                                                    ) : (
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(v)}
                                                    disabled={isPending && busyId === v._id}
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Vendor" : "New Vendor"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="vendor-name">Name</Label>
                            <Input
                                id="vendor-name"
                                value={form.name}
                                onChange={(e) => set("name", e.target.value)}
                                placeholder="Acme Supplies Ltd."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="vendor-contact">Contact name</Label>
                                <Input
                                    id="vendor-contact"
                                    value={form.contactName}
                                    onChange={(e) => set("contactName", e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="vendor-phone">Phone</Label>
                                <Input
                                    id="vendor-phone"
                                    value={form.phone}
                                    onChange={(e) => set("phone", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="vendor-email">Email</Label>
                                <Input
                                    id="vendor-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => set("email", e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="vendor-tax">Tax / Reg. ID</Label>
                                <Input
                                    id="vendor-tax"
                                    value={form.taxId}
                                    onChange={(e) => set("taxId", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="vendor-address">Address</Label>
                            <Textarea
                                id="vendor-address"
                                rows={2}
                                value={form.address}
                                onChange={(e) => set("address", e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="vendor-terms">Payment terms</Label>
                                <Input
                                    id="vendor-terms"
                                    value={form.paymentTerms}
                                    onChange={(e) => set("paymentTerms", e.target.value)}
                                    placeholder="net-30"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Default payable account</Label>
                                <Select
                                    value={form.payableAccountId || NONE}
                                    onValueChange={(v) => set("payableAccountId", v === NONE ? "" : v)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Default A/P" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={NONE}>Default A/P</SelectItem>
                                        {payableAccounts.map((a) => (
                                            <SelectItem key={a._id} value={a._id}>
                                                {a.code} — {a.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={save} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editing ? "Save Changes" : "Create Vendor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
