"use client";

import { useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Check, X, Inbox, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatMoney } from "@/lib/utils";
import {
    nextPendingStepIndex,
    isStepSatisfied,
    describeStep,
    type ChainStep,
} from "@/lib/accounting/approvals";
import { approve, reject } from "@/lib/actions/accounting/expense.actions";

interface Populated {
    _id?: string;
    name?: string;
}

interface StepApproverRow {
    kind: "staff" | "role";
    value: string;
    label?: string;
}

interface StepDecisionRow {
    approverId?: string;
    approverName?: string;
    decision: "approved" | "rejected";
    reason?: string;
}

interface ApprovalStepRow {
    // legacy single-role step
    role?: string;
    decision?: "approved" | "rejected" | null;
    reason?: string;
    decidedAt?: string | null;
    // new quorum step
    approvers?: StepApproverRow[];
    requiredCount?: number;
    decisions?: StepDecisionRow[];
}

interface ExpenseRow {
    _id: string;
    expenseNo: string;
    date: string;
    amount: number;
    payee?: string;
    description?: string;
    expenseAccountId?: Populated | null;
    vendorId?: Populated | null;
    approvalChain: ApprovalStepRow[];
}

export default function ApprovalsInbox({
    expenses: initial,
    currency = "",
}: {
    expenses: ExpenseRow[];
    currency?: string;
}) {
    const router = useRouter();
    const path = usePathname();
    const money = (n: number) => formatMoney(n, currency);
    const [isPending, startTransition] = useTransition();
    const [busyId, setBusyId] = useState<string | null>(null);

    const [rejectTarget, setRejectTarget] = useState<ExpenseRow | null>(null);
    const [reason, setReason] = useState("");

    const approveExpense = (id: string) => {
        setBusyId(id);
        startTransition(async () => {
            try {
                await approve(id, path);
                toast.success("Expense approved");
                router.refresh();
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "You cannot approve this expense",
                );
            } finally {
                setBusyId(null);
            }
        });
    };

    const confirmReject = () => {
        if (!rejectTarget) return;
        const id = rejectTarget._id;
        setBusyId(id);
        startTransition(async () => {
            try {
                await reject(id, reason.trim(), path);
                toast.success("Expense rejected");
                setRejectTarget(null);
                setReason("");
                router.refresh();
            } catch (error) {
                toast.error(
                    error instanceof Error ? error.message : "You cannot reject this expense",
                );
            } finally {
                setBusyId(null);
            }
        });
    };

    if (!initial || initial.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                    <Inbox className="h-8 w-8" />
                    <p className="text-sm">No expenses are awaiting approval right now.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <div className="space-y-4">
                {initial.map((e) => {
                    const chain = (e.approvalChain || []) as unknown as ChainStep[];
                    const nextIdx = nextPendingStepIndex(chain);
                    const nextStep = nextIdx >= 0 ? chain[nextIdx] : null;
                    const nextLabel = nextStep
                        ? (nextStep.approvers && nextStep.approvers.length
                            ? describeStep(nextStep)
                            : ((nextStep as unknown as { role?: string }).role || "—"))
                        : "—";
                    const busy = isPending && busyId === e._id;
                    return (
                        <Card key={e._id}>
                            <CardContent className="space-y-4 pt-6">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {e.expenseNo}
                                            </span>
                                            <Badge variant="outline">submitted</Badge>
                                        </div>
                                        <p className="mt-1 text-lg font-semibold">{money(e.amount)}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {e.expenseAccountId?.name || "—"}
                                            {" • "}
                                            {e.vendorId?.name || e.payee || "No vendor"}
                                            {e.date ? ` • ${new Date(e.date).toLocaleDateString()}` : ""}
                                        </p>
                                        {e.description ? (
                                            <p className="mt-1 text-sm">{e.description}</p>
                                        ) : null}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Next approver</p>
                                        <Badge className="mt-1">{nextLabel}</Badge>
                                    </div>
                                </div>

                                {/* Frozen approval chain */}
                                <div>
                                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                        Approval chain
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        {chain.map((step, idx) => {
                                            const isNew = Array.isArray(step.approvers) && step.approvers.length > 0;
                                            const satisfied = isNew
                                                ? isStepSatisfied(step)
                                                : Boolean((step as unknown as { decision?: string }).decision);
                                            const rejected = isNew
                                                ? (step.decisions || []).some((d) => d.decision === "rejected")
                                                : (step as unknown as { decision?: string }).decision === "rejected";
                                            const isCurrent = idx === nextIdx;
                                            const approvedN = isNew ? (step.decisions || []).filter((d) => d.decision === "approved").length : (satisfied && !rejected ? 1 : 0);
                                            const totalN = isNew ? step.requiredCount || step.approvers!.length : 1;
                                            const names = isNew
                                                ? step.approvers!.map((a) => a.label || a.value).join(", ")
                                                : ((step as unknown as { role?: string }).role || "approver");
                                            const decidedBy = isNew
                                                ? (step.decisions || []).map((d) => (d.approverName || "someone") + ": " + d.decision).join("; ")
                                                : "";
                                            return (
                                                <div
                                                    key={idx}
                                                    className={"rounded-md border px-3 py-2 text-sm " + (isCurrent ? "border-primary bg-primary/5" : rejected ? "border-destructive/50" : satisfied ? "border-emerald-500/40" : "border-muted")}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold text-muted-foreground">Step {idx + 1}</span>
                                                        {rejected ? (
                                                            <Badge variant="destructive" className="gap-1"><X className="h-3 w-3" /> rejected</Badge>
                                                        ) : satisfied ? (
                                                            <Badge className="gap-1"><Check className="h-3 w-3" /> approved</Badge>
                                                        ) : isCurrent ? (
                                                            <Badge variant="outline">awaiting</Badge>
                                                        ) : (
                                                            <Badge variant="secondary">pending</Badge>
                                                        )}
                                                        <span className="text-xs text-muted-foreground">{approvedN} of {totalN} approved</span>
                                                    </div>
                                                    <div className="mt-1">{names}</div>
                                                    {decidedBy ? (
                                                        <div className="mt-0.5 text-xs text-muted-foreground">{decidedBy}</div>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setRejectTarget(e);
                                            setReason("");
                                        }}
                                        disabled={busy}
                                    >
                                        <X className="mr-2 h-4 w-4" /> Reject
                                    </Button>
                                    <Button onClick={() => approveExpense(e._id)} disabled={busy}>
                                        {busy ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Check className="mr-2 h-4 w-4" />
                                        )}
                                        Approve
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            Reject {rejectTarget?.expenseNo}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-2 py-2">
                        <Label htmlFor="reject-reason">Reason (optional)</Label>
                        <Textarea
                            id="reject-reason"
                            rows={3}
                            value={reason}
                            onChange={(ev) => setReason(ev.target.value)}
                            placeholder="Why is this expense being rejected?"
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setRejectTarget(null)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmReject} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Reject Expense
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
