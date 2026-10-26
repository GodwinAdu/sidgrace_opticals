"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    Lock,
    LockOpen,
    CalendarDays,
    ShieldCheck,
    Save,
    Sprout,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import {
    configure as configurePeriod,
    close as closePeriod,
    reopen as reopenPeriod,
} from "@/lib/actions/accounting/accounting-period.actions";
import {
    createApprovalRule,
    updateApprovalRule,
    deleteApprovalRule,
} from "@/lib/actions/accounting/approval-rule.actions";
import { updateSettings } from "@/lib/actions/accounting/accounting-settings.actions";
import { seedDefaultChart } from "@/lib/actions/accounting/chart-account.actions";

/* ──────────────────────────────── types ──────────────────────────────── */

interface PeriodRow {
    _id: string;
    fiscalYear: number;
    periodNo: number;
    start: string;
    end: string;
    status: "open" | "closed";
}

interface RuleRow {
    _id: string;
    name: string;
    minAmount: number;
    maxAmount?: number | null;
    approverRoles: string[];
    steps?: RuleStepRow[];
    isDefault: boolean;
    isActive: boolean;
}

interface RuleApproverRow {
    kind: "staff" | "role";
    value: string;
    label?: string;
}

interface RuleStepRow {
    approvers: RuleApproverRow[];
    requiredCount: number;
}

interface StaffOption {
    _id: string;
    fullName: string;
    role?: string;
}

interface AccountOption {
    _id: string;
    code: string;
    name: string;
    type: string;
}

interface DefaultAccounts {
    cash?: string;
    accountsReceivable?: string;
    accountsPayable?: string;
    revenue?: string;
    expense?: string;
    insuranceReceivable?: string;
    inventory?: string;
    payrollExpense?: string;
    revenueByCategory?: Record<string, string>;
    expenseByCategory?: Record<string, string>;
}

interface SettingsDoc {
    _id?: string;
    periodValidation: "strict" | "lenient";
    basisDefault: "accrual" | "cash";
    overBudgetMode?: "warn" | "block";
    defaultAccounts: DefaultAccounts;
}

/* ──────────────── default-account mapping field metadata ──────────────── */

type MappingKey = Exclude<keyof DefaultAccounts, "revenueByCategory" | "expenseByCategory">;

const MAPPING_FIELDS: { key: MappingKey; label: string; hint: string }[] = [
    { key: "cash", label: "Cash", hint: "Default cash / bank account" },
    { key: "accountsReceivable", label: "Accounts Receivable", hint: "Patient / customer receivables" },
    { key: "accountsPayable", label: "Accounts Payable", hint: "Vendor payables" },
    { key: "revenue", label: "Revenue", hint: "Default operating revenue" },
    { key: "expense", label: "Expense", hint: "Default operating expense" },
    { key: "insuranceReceivable", label: "Insurance Receivable", hint: "Insurer receivables" },
    { key: "inventory", label: "Inventory", hint: "Inventory asset" },
    { key: "payrollExpense", label: "Payroll Expense", hint: "Salaries & wages" },
];

/* Mapping cards grouped by statement area for a cleaner, professional layout. */
const MAPPING_GROUPS: { title: string; description: string; keys: MappingKey[] }[] = [
    {
        title: "Assets & Liabilities",
        description: "Balance-sheet control accounts the ledger posts against.",
        keys: ["cash", "accountsReceivable", "insuranceReceivable", "inventory", "accountsPayable"],
    },
    {
        title: "Income & Expense defaults",
        description: "Fallback accounts used whenever a category below is left unmapped.",
        keys: ["revenue", "expense", "payrollExpense"],
    },
];

/* Canonical income/expense categories the posting bridge emits. Clinics map each
   to a specific account; an unmapped category falls back to the Revenue/Expense
   default above. KEEP IN SYNC with the bridge's `category` labels. */
const REVENUE_CATEGORIES: { key: string; label: string; hint: string }[] = [
    { key: "Consultation", label: "Consultation", hint: "Consultation / visit fees" },
    { key: "Procedure", label: "Procedure", hint: "Procedures & treatments" },
    { key: "Insurance Reimbursement", label: "Insurance Reimbursement", hint: "Insurer reimbursements" },
    { key: "Other Income", label: "Other Income", hint: "Miscellaneous income" },
];

const EXPENSE_CATEGORIES: { key: string; label: string; hint: string }[] = [
    { key: "Payroll", label: "Payroll", hint: "Salaries & wages" },
    { key: "Inventory Purchase", label: "Inventory Purchase", hint: "Stock / drug purchases" },
    { key: "Other Expense", label: "Other Expense", hint: "Miscellaneous operating expense" },
];

/* Account-type guard so each picker only offers the correct statement side. */
const REVENUE_TYPES = new Set(["revenue", "income"]);
const EXPENSE_TYPES = new Set(["expense", "cogs", "cost-of-goods-sold"]);

const PERIOD_LABELS = [
    "P1", "P2", "P3", "P4", "P5", "P6",
    "P7", "P8", "P9", "P10", "P11", "P12", "P13",
];

const toDateInput = (v?: string) => (v ? new Date(v).toISOString().slice(0, 10) : "");

/* The mapping pickers store ChartAccount codes (the bridge keys on code). */
const codeFor = (accounts: AccountOption[], code?: string) =>
    accounts.find((a) => a.code === code)?.code || code || "";

const EMPTY_PERIOD = {
    fiscalYear: new Date().getFullYear(),
    periodNo: 1,
    start: "",
    end: "",
};

const EMPTY_RULE = {
    name: "",
    minAmount: "0",
    maxAmount: "",
    approverRoles: "",
    isDefault: false,
    isActive: true,
};

export default function AccountingSettings({
    settings: initialSettings,
    periods: initialPeriods,
    rules: initialRules,
    accounts,
    staffs,
    fiscalYear,
}: {
    settings: SettingsDoc;
    periods: PeriodRow[];
    rules: RuleRow[];
    accounts: AccountOption[];
    staffs: StaffOption[];
    fiscalYear: number;
}) {
    const router = useRouter();
    const path = usePathname();
    const [isPending, startTransition] = useTransition();
    const [busyId, setBusyId] = useState<string | null>(null);

    /* ───────────── Policy + default-account mappings ───────────── */
    const [policy, setPolicy] = useState({
        periodValidation: initialSettings?.periodValidation || "lenient",
        basisDefault: initialSettings?.basisDefault || "accrual",
        overBudgetMode: initialSettings?.overBudgetMode || "warn",
    });
    const [mappings, setMappings] = useState<DefaultAccounts>({
        ...(initialSettings?.defaultAccounts || {}),
    });
    // Per-category income/expense → account maps (keyed by category label).
    const [revenueByCategory, setRevenueByCategory] = useState<Record<string, string>>({
        ...(initialSettings?.defaultAccounts?.revenueByCategory || {}),
    });
    const [expenseByCategory, setExpenseByCategory] = useState<Record<string, string>>({
        ...(initialSettings?.defaultAccounts?.expenseByCategory || {}),
    });

    const savePolicy = () => {
        // Warn (don't block) when a custom category was added but left on
        // "Use default": the server merge drops empty values, so such a row would
        // not persist and would vanish on reload. Named here so the clinic knows.
        const emptyRevenue = Object.entries(revenueByCategory)
            .filter(([k, v]) => !String(v || "").trim() && !REVENUE_CATEGORIES.some((c) => c.key === k))
            .map(([k]) => k);
        const emptyExpense = Object.entries(expenseByCategory)
            .filter(([k, v]) => !String(v || "").trim() && !EXPENSE_CATEGORIES.some((c) => c.key === k))
            .map(([k]) => k);
        const unmapped = [...emptyRevenue, ...emptyExpense];
        if (unmapped.length > 0) {
            toast.warning(
                `These custom categories have no account yet and won't be saved: ${unmapped.join(", ")}`,
            );
        }

        startTransition(async () => {
            try {
                await updateSettings(
                    {
                        periodValidation: policy.periodValidation,
                        basisDefault: policy.basisDefault,
                        overBudgetMode: policy.overBudgetMode,
                        defaultAccounts: {
                            ...mappings,
                            revenueByCategory,
                            expenseByCategory,
                        },
                    },
                    path,
                );
                toast.success("Accounting settings saved");
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save settings");
            }
        });
    };

    const seedChart = () => {
        setBusyId("seed");
        startTransition(async () => {
            try {
                const res = await seedDefaultChart(path);
                toast.success(
                    `Default chart seeded — ${res?.inserted ?? 0} new of ${res?.total ?? 0} accounts`,
                );
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not seed chart");
            } finally {
                setBusyId(null);
            }
        });
    };

    /* ───────────── Fiscal periods ───────────── */
    const [periodOpen, setPeriodOpen] = useState(false);
    const [periodForm, setPeriodForm] = useState({ ...EMPTY_PERIOD, fiscalYear });

    const openConfigurePeriod = () => {
        setPeriodForm({ ...EMPTY_PERIOD, fiscalYear });
        setPeriodOpen(true);
    };

    const savePeriod = () => {
        if (!periodForm.start || !periodForm.end) {
            toast.error("Provide the period start and end dates");
            return;
        }
        startTransition(async () => {
            try {
                await configurePeriod(
                    {
                        fiscalYear: Number(periodForm.fiscalYear),
                        periodNo: Number(periodForm.periodNo),
                        start: periodForm.start,
                        end: periodForm.end,
                    },
                    path,
                );
                toast.success("Period configured");
                setPeriodOpen(false);
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not configure period");
            }
        });
    };

    const togglePeriodLock = (p: PeriodRow) => {
        setBusyId(p._id);
        startTransition(async () => {
            try {
                if (p.status === "closed") {
                    await reopenPeriod(p._id, path);
                    toast.success(`Reopened ${p.fiscalYear}-P${p.periodNo}`);
                } else {
                    await closePeriod(p._id, path);
                    toast.success(`Closed ${p.fiscalYear}-P${p.periodNo}`);
                }
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not change period lock");
            } finally {
                setBusyId(null);
            }
        });
    };

    /* ───────────── Approval rules ───────────── */
    const [ruleOpen, setRuleOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<RuleRow | null>(null);
    const [ruleForm, setRuleForm] = useState({ ...EMPTY_RULE });
    const [ruleSteps, setRuleSteps] = useState<RuleStepRow[]>([]);

    const openCreateRule = () => {
        setEditingRule(null);
        setRuleForm({ ...EMPTY_RULE });
        setRuleSteps([{ approvers: [{ kind: "role", value: "" }], requiredCount: 1 }]);
        setRuleOpen(true);
    };

    const openEditRule = (r: RuleRow) => {
        setEditingRule(r);
        setRuleForm({
            name: r.name || "",
            minAmount: String(r.minAmount ?? 0),
            maxAmount: r.maxAmount === null || r.maxAmount === undefined ? "" : String(r.maxAmount),
            approverRoles: (r.approverRoles || []).join(", "),
            isDefault: !!r.isDefault,
            isActive: !!r.isActive,
        });
        // Pre-populate the step builder: prefer structured steps, else convert
        // each legacy role into a 1-of-1 role step so old rules edit cleanly.
        if (r.steps && r.steps.length > 0) {
            setRuleSteps(
                r.steps.map((s) => ({
                    approvers: (s.approvers || []).map((a) => ({ kind: a.kind, value: a.value, label: a.label })),
                    requiredCount: s.requiredCount || 1,
                })),
            );
        } else {
            setRuleSteps(
                (r.approverRoles || []).map((role) => ({
                    approvers: [{ kind: "role" as const, value: role }],
                    requiredCount: 1,
                })),
            );
        }
        setRuleOpen(true);
    };

    /* ---- approval-step builder mutations ---- */
    const addStep = () =>
        setRuleSteps((prev) => [...prev, { approvers: [{ kind: "role", value: "" }], requiredCount: 1 }]);
    const removeStep = (si: number) =>
        setRuleSteps((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== si)));
    const addApprover = (si: number) =>
        setRuleSteps((prev) =>
            prev.map((s, i) =>
                i === si ? { ...s, approvers: [...s.approvers, { kind: "role", value: "" }] } : s,
            ),
        );
    const removeApprover = (si: number, ai: number) =>
        setRuleSteps((prev) =>
            prev.map((s, i) => {
                if (i !== si) return s;
                const approvers = s.approvers.length <= 1 ? s.approvers : s.approvers.filter((_, j) => j !== ai);
                const requiredCount = Math.min(s.requiredCount, approvers.length) || 1;
                return { ...s, approvers, requiredCount };
            }),
        );
    const setApprover = (si: number, ai: number, patch: Partial<RuleApproverRow>) =>
        setRuleSteps((prev) =>
            prev.map((s, i) =>
                i === si
                    ? { ...s, approvers: s.approvers.map((a, j) => (j === ai ? { ...a, ...patch } : a)) }
                    : s,
            ),
        );
    const setRequiredCount = (si: number, n: number) =>
        setRuleSteps((prev) =>
            prev.map((s, i) => {
                if (i !== si) return s;
                let req = Math.floor(n) || 1;
                if (req < 1) req = 1;
                if (req > s.approvers.length) req = s.approvers.length;
                return { ...s, requiredCount: req };
            }),
        );

    const saveRule = () => {
        if (!ruleForm.name.trim()) {
            toast.error("A rule name is required");
            return;
        }
        // Build structured steps from the builder: keep only approvers with a
        // value, clamp each step's quorum into [1, approverCount], drop empties.
        const steps = ruleSteps
            .map((s) => {
                const approvers = s.approvers
                    .filter((a) => a.value && String(a.value).trim())
                    .map((a) => ({
                        kind: a.kind,
                        value: String(a.value).trim(),
                        label:
                            a.kind === "staff"
                                ? staffs.find((st) => st._id === a.value)?.fullName || a.label || ""
                                : a.value,
                    }));
                let req = Number(s.requiredCount) || 1;
                if (req < 1) req = 1;
                if (req > approvers.length) req = approvers.length;
                return { approvers, requiredCount: req };
            })
            .filter((s) => s.approvers.length > 0);

        if (steps.length === 0) {
            toast.error("Add at least one approval step with an approver (a staff member or a role).");
            return;
        }
        const payload = {
            name: ruleForm.name.trim(),
            minAmount: Number(ruleForm.minAmount) || 0,
            maxAmount: ruleForm.maxAmount.trim() === "" ? null : Number(ruleForm.maxAmount),
            steps,
            isDefault: ruleForm.isDefault,
            isActive: ruleForm.isActive,
        };
        startTransition(async () => {
            try {
                if (editingRule?._id) {
                    await updateApprovalRule(editingRule._id, payload, path);
                    toast.success("Approval rule updated");
                } else {
                    await createApprovalRule(payload, path);
                    toast.success("Approval rule created");
                }
                setRuleOpen(false);
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save rule");
            }
        });
    };

    const removeRule = (r: RuleRow) => {
        setBusyId(r._id);
        startTransition(async () => {
            try {
                await deleteApprovalRule(r._id, path);
                toast.success("Approval rule deleted");
                router.refresh();
            } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not delete rule");
            } finally {
                setBusyId(null);
            }
        });
    };

    const sortedAccounts = useMemo(
        () => [...accounts].sort((a, b) => a.code.localeCompare(b.code)),
        [accounts],
    );

    // "Add category" input state (one per statement side).
    const [newRevenueCat, setNewRevenueCat] = useState("");
    const [newExpenseCat, setNewExpenseCat] = useState("");

    // The displayed category rows = the seeded categories PLUS any extra keys the
    // clinic has already saved into the map (so custom categories survive a
    // reload). Seeded keys are not removable; custom keys are.
    const seededRevenueKeys = useMemo(() => new Set(REVENUE_CATEGORIES.map((c) => c.key)), []);
    const seededExpenseKeys = useMemo(() => new Set(EXPENSE_CATEGORIES.map((c) => c.key)), []);

    const revenueRows = useMemo(() => {
        const rows = REVENUE_CATEGORIES.map((c) => ({ ...c, custom: false }));
        for (const key of Object.keys(revenueByCategory)) {
            if (!seededRevenueKeys.has(key)) {
                rows.push({ key, label: key, hint: "Custom income category", custom: true });
            }
        }
        return rows;
    }, [revenueByCategory, seededRevenueKeys]);

    const expenseRows = useMemo(() => {
        const rows = EXPENSE_CATEGORIES.map((c) => ({ ...c, custom: false }));
        for (const key of Object.keys(expenseByCategory)) {
            if (!seededExpenseKeys.has(key)) {
                rows.push({ key, label: key, hint: "Custom expense category", custom: true });
            }
        }
        return rows;
    }, [expenseByCategory, seededExpenseKeys]);

    // Add a custom category: validate, dedupe (case-insensitive against seeded +
    // existing), then seed the map with an empty value (= "use default" until the
    // clinic picks an account). A category only persists on Save.
    const addRevenueCategory = () => {
        const name = newRevenueCat.trim();
        if (!name) return;
        const exists =
            revenueRows.some((r) => r.key.toLowerCase() === name.toLowerCase()) ||
            Object.keys(revenueByCategory).some((k) => k.toLowerCase() === name.toLowerCase());
        if (exists) {
            toast.error(`Income category "${name}" already exists`);
            return;
        }
        setRevenueByCategory((m) => ({ ...m, [name]: "" }));
        setNewRevenueCat("");
    };
    const addExpenseCategory = () => {
        const name = newExpenseCat.trim();
        if (!name) return;
        const exists =
            expenseRows.some((r) => r.key.toLowerCase() === name.toLowerCase()) ||
            Object.keys(expenseByCategory).some((k) => k.toLowerCase() === name.toLowerCase());
        if (exists) {
            toast.error(`Expense category "${name}" already exists`);
            return;
        }
        setExpenseByCategory((m) => ({ ...m, [name]: "" }));
        setNewExpenseCat("");
    };

    // Remove a custom category entirely from the map.
    const removeRevenueCategory = (key: string) =>
        setRevenueByCategory((m) => {
            const next = { ...m };
            delete next[key];
            return next;
        });
    const removeExpenseCategory = (key: string) =>
        setExpenseByCategory((m) => {
            const next = { ...m };
            delete next[key];
            return next;
        });

    // Accounts filtered by statement side so each category picker only offers
    // valid options (revenue categories → revenue accounts, etc.). Falls back to
    // the full list if the chart has no typed accounts for that side.
    const revenueAccounts = useMemo(() => {
        const filtered = sortedAccounts.filter((a) => REVENUE_TYPES.has(String(a.type).toLowerCase()));
        return filtered.length > 0 ? filtered : sortedAccounts;
    }, [sortedAccounts]);
    const expenseAccounts = useMemo(() => {
        const filtered = sortedAccounts.filter((a) => EXPENSE_TYPES.has(String(a.type).toLowerCase()));
        return filtered.length > 0 ? filtered : sortedAccounts;
    }, [sortedAccounts]);

    // The single global defaults shown as the "fallback" chip on each category row.
    const revenueDefaultLabel =
        sortedAccounts.find((a) => a.code === mappings.revenue)?.name || "Revenue default";
    const expenseDefaultLabel =
        sortedAccounts.find((a) => a.code === mappings.expense)?.name || "Expense default";

    /* A reusable row: a category label + a (type-filtered) account picker whose
       empty value means "use the global default". Custom (clinic-added)
       categories also show a remove button via `onRemove`; seeded categories
       that the posting bridge emits are not removable. */
    const CategoryRow = ({
        label,
        hint,
        value,
        options,
        fallbackLabel,
        custom,
        onChange,
        onRemove,
    }: {
        label: string;
        hint: string;
        value?: string;
        options: AccountOption[];
        fallbackLabel: string;
        custom?: boolean;
        onChange: (code: string) => void;
        onRemove?: () => void;
    }) => (
        <div className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{label}</p>
                    {custom ? (
                        <Badge variant="outline" className="text-[10px]">custom</Badge>
                    ) : null}
                </div>
                <p className="text-xs text-muted-foreground">{hint}</p>
            </div>
            <div className="flex items-center gap-2 sm:w-[300px]">
                <Select
                    value={value && value.trim() ? value : "__default__"}
                    onValueChange={(v) => onChange(v === "__default__" ? "" : v)}
                >
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__default__">
                            Use default ({fallbackLabel})
                        </SelectItem>
                        {options.map((a) => (
                            <SelectItem key={a._id} value={a.code}>
                                {a.code} — {a.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {onRemove ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        title="Remove category"
                        onClick={onRemove}
                    >
                        <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                ) : null}
            </div>
        </div>
    );

    return (
        <Tabs defaultValue="periods" className="space-y-4">
            <TabsList>
                <TabsTrigger value="periods">
                    <CalendarDays className="mr-2 h-4 w-4" /> Fiscal Periods
                </TabsTrigger>
                <TabsTrigger value="rules">
                    <ShieldCheck className="mr-2 h-4 w-4" /> Approval Rules
                </TabsTrigger>
                <TabsTrigger value="policy">
                    <Save className="mr-2 h-4 w-4" /> Policy & Mappings
                </TabsTrigger>
            </TabsList>

            {/* ───────────── Fiscal periods ───────────── */}
            <TabsContent value="periods">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Fiscal Periods
                    </h3>
                    <Button size="sm" onClick={openConfigurePeriod}>
                        <Plus className="mr-2 h-4 w-4" /> Configure Period
                    </Button>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        {!initialPeriods || initialPeriods.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No fiscal periods configured yet. Configure periods to enable the posting-date soft lock.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fiscal Year</TableHead>
                                        <TableHead>Period</TableHead>
                                        <TableHead>Start</TableHead>
                                        <TableHead>End</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialPeriods.map((p) => (
                                        <TableRow key={p._id}>
                                            <TableCell className="font-medium">{p.fiscalYear}</TableCell>
                                            <TableCell>P{p.periodNo}</TableCell>
                                            <TableCell className="font-mono text-xs">{toDateInput(p.start)}</TableCell>
                                            <TableCell className="font-mono text-xs">{toDateInput(p.end)}</TableCell>
                                            <TableCell>
                                                <Badge variant={p.status === "open" ? "default" : "secondary"}>
                                                    {p.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => togglePeriodLock(p)}
                                                    disabled={isPending && busyId === p._id}
                                                >
                                                    {busyId === p._id && isPending ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : p.status === "closed" ? (
                                                        <LockOpen className="mr-2 h-4 w-4 text-emerald-600" />
                                                    ) : (
                                                        <Lock className="mr-2 h-4 w-4 text-amber-600" />
                                                    )}
                                                    {p.status === "closed" ? "Reopen" : "Close"}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            {/* ───────────── Approval rules ───────────── */}
            <TabsContent value="rules">
                <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        Approval Rules
                    </h3>
                    <Button size="sm" onClick={openCreateRule}>
                        <Plus className="mr-2 h-4 w-4" /> New Rule
                    </Button>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        {!initialRules || initialRules.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No approval rules yet. Add rules so submitted expenses freeze a chain of approver roles by amount band.
                            </p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead className="text-right">Min</TableHead>
                                        <TableHead className="text-right">Max</TableHead>
                                        <TableHead>Chain</TableHead>
                                        <TableHead>Flags</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialRules.map((r) => (
                                        <TableRow key={r._id}>
                                            <TableCell className="font-medium">{r.name}</TableCell>
                                            <TableCell className="text-right font-mono">{r.minAmount}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {r.maxAmount === null || r.maxAmount === undefined ? "∞" : r.maxAmount}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-wrap gap-1">
                                                    {(r.approverRoles || []).map((role, idx) => (
                                                        <Badge key={`${role}-${idx}`} variant="outline">
                                                            {role}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-1">
                                                    {r.isDefault ? <Badge>default</Badge> : null}
                                                    <Badge variant={r.isActive ? "secondary" : "destructive"}>
                                                        {r.isActive ? "active" : "inactive"}
                                                    </Badge>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditRule(r)}
                                                        disabled={isPending}
                                                        title="Edit"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => removeRule(r)}
                                                        disabled={isPending && busyId === r._id}
                                                        title="Delete"
                                                    >
                                                        {busyId === r._id && isPending ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        )}
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
            </TabsContent>

            {/* ───────────── Policy + mappings ───────────── */}
            <TabsContent value="policy">
                <div className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Posting Policy</CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 md:grid-cols-3">
                            <div className="grid gap-2">
                                <Label>Period validation</Label>
                                <Select
                                    value={policy.periodValidation}
                                    onValueChange={(v) =>
                                        setPolicy((p) => ({ ...p, periodValidation: v as "strict" | "lenient" }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="lenient">Lenient</SelectItem>
                                        <SelectItem value="strict">Strict</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Default basis</Label>
                                <Select
                                    value={policy.basisDefault}
                                    onValueChange={(v) =>
                                        setPolicy((p) => ({ ...p, basisDefault: v as "accrual" | "cash" }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="accrual">Accrual</SelectItem>
                                        <SelectItem value="cash">Cash</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Over-budget mode</Label>
                                <Select
                                    value={policy.overBudgetMode}
                                    onValueChange={(v) =>
                                        setPolicy((p) => ({ ...p, overBudgetMode: v as "warn" | "block" }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="warn">Warn</SelectItem>
                                        <SelectItem value="block">Block</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-start justify-between gap-4">
                            <div className="space-y-1">
                                <CardTitle className="text-base">Default Account Mappings</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Control accounts the ledger posts against. These are the fallback
                                    accounts; income and expense can be refined per category below.
                                </p>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={seedChart}
                                disabled={isPending && busyId === "seed"}
                            >
                                {busyId === "seed" && isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Sprout className="mr-2 h-4 w-4" />
                                )}
                                Seed default chart
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {MAPPING_GROUPS.map((group) => (
                                <div key={group.title} className="space-y-3">
                                    <div>
                                        <h4 className="text-sm font-semibold">{group.title}</h4>
                                        <p className="text-xs text-muted-foreground">{group.description}</p>
                                    </div>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {group.keys.map((key) => {
                                            const field = MAPPING_FIELDS.find((f) => f.key === key)!;
                                            return (
                                                <div key={field.key} className="grid gap-2">
                                                    <Label>{field.label}</Label>
                                                    <Select
                                                        value={codeFor(sortedAccounts, mappings[field.key] as string | undefined)}
                                                        onValueChange={(v) =>
                                                            setMappings((m) => ({ ...m, [field.key]: v }))
                                                        }
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={field.hint} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {sortedAccounts.map((a) => (
                                                                <SelectItem key={a._id} value={a.code}>
                                                                    {a.code} — {a.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-muted-foreground">{field.hint}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    {/* Per-category income mappings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Income Account Mapping</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Route each type of income to its own revenue account. Anything left on
                                “Use default” posts to the Revenue default above. Add your own categories
                                to match how this clinic records income.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {revenueRows.map((cat) => (
                                <CategoryRow
                                    key={cat.key}
                                    label={cat.label}
                                    hint={cat.hint}
                                    custom={cat.custom}
                                    value={revenueByCategory[cat.key]}
                                    options={revenueAccounts}
                                    fallbackLabel={revenueDefaultLabel}
                                    onChange={(code) =>
                                        setRevenueByCategory((m) => ({ ...m, [cat.key]: code }))
                                    }
                                    onRemove={cat.custom ? () => removeRevenueCategory(cat.key) : undefined}
                                />
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                                <Input
                                    value={newRevenueCat}
                                    onChange={(e) => setNewRevenueCat(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addRevenueCategory();
                                        }
                                    }}
                                    placeholder="Add an income category (e.g. Pharmacy Sales)"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addRevenueCategory}
                                    disabled={!newRevenueCat.trim()}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Per-category expense mappings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Expense Account Mapping</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Route each type of expense to its own expense account. Anything left on
                                “Use default” posts to the Expense default above. Add your own categories
                                to match how this clinic records costs.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {expenseRows.map((cat) => (
                                <CategoryRow
                                    key={cat.key}
                                    label={cat.label}
                                    hint={cat.hint}
                                    custom={cat.custom}
                                    value={expenseByCategory[cat.key]}
                                    options={expenseAccounts}
                                    fallbackLabel={expenseDefaultLabel}
                                    onChange={(code) =>
                                        setExpenseByCategory((m) => ({ ...m, [cat.key]: code }))
                                    }
                                    onRemove={cat.custom ? () => removeExpenseCategory(cat.key) : undefined}
                                />
                            ))}
                            <div className="flex items-center gap-2 pt-1">
                                <Input
                                    value={newExpenseCat}
                                    onChange={(e) => setNewExpenseCat(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addExpenseCategory();
                                        }
                                    }}
                                    placeholder="Add an expense category (e.g. Rent, Utilities)"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={addExpenseCategory}
                                    disabled={!newExpenseCat.trim()}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button onClick={savePolicy} disabled={isPending}>
                            {isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Settings
                        </Button>
                    </div>
                </div>
            </TabsContent>

            {/* ───────────── Configure period dialog ───────────── */}
            <Dialog open={periodOpen} onOpenChange={setPeriodOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Configure Fiscal Period</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="period-year">Fiscal year</Label>
                                <Input
                                    id="period-year"
                                    type="number"
                                    value={periodForm.fiscalYear}
                                    onChange={(e) =>
                                        setPeriodForm((f) => ({ ...f, fiscalYear: Number(e.target.value) }))
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Period</Label>
                                <Select
                                    value={String(periodForm.periodNo)}
                                    onValueChange={(v) =>
                                        setPeriodForm((f) => ({ ...f, periodNo: Number(v) }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PERIOD_LABELS.map((label, idx) => (
                                            <SelectItem key={label} value={String(idx + 1)}>
                                                {label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="period-start">Start</Label>
                                <Input
                                    id="period-start"
                                    type="date"
                                    value={periodForm.start}
                                    onChange={(e) =>
                                        setPeriodForm((f) => ({ ...f, start: e.target.value }))
                                    }
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="period-end">End</Label>
                                <Input
                                    id="period-end"
                                    type="date"
                                    value={periodForm.end}
                                    onChange={(e) =>
                                        setPeriodForm((f) => ({ ...f, end: e.target.value }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setPeriodOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={savePeriod} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Save Period
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ───────────── Approval rule dialog ───────────── */}
            <Dialog open={ruleOpen} onOpenChange={setRuleOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingRule ? "Edit Approval Rule" : "New Approval Rule"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="rule-name">Name</Label>
                            <Input
                                id="rule-name"
                                value={ruleForm.name}
                                onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))}
                                placeholder="Expenses over 10k"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="rule-min">Min amount</Label>
                                <Input
                                    id="rule-min"
                                    type="number"
                                    min={0}
                                    value={ruleForm.minAmount}
                                    onChange={(e) => setRuleForm((f) => ({ ...f, minAmount: e.target.value }))}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="rule-max">Max amount</Label>
                                <Input
                                    id="rule-max"
                                    type="number"
                                    value={ruleForm.maxAmount}
                                    onChange={(e) => setRuleForm((f) => ({ ...f, maxAmount: e.target.value }))}
                                    placeholder="Blank = and above"
                                />
                            </div>
                        </div>
                        <div className="grid gap-3">
                            <div className="flex items-center justify-between">
                                <Label>Approval steps (in order)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addStep}>
                                    <Plus className="mr-1 h-3.5 w-3.5" /> Add step
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Each step runs in order. A step can name specific staff and/or a role, and you can
                                require two or more of them to approve before it advances.
                            </p>

                            {ruleSteps.map((step, si) => (
                                <div key={si} className="rounded-lg border p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-muted-foreground">Step {si + 1}</span>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeStep(si)} disabled={ruleSteps.length <= 1}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {step.approvers.map((ap, ai) => (
                                        <div key={ai} className="flex items-center gap-2">
                                            <Select value={ap.kind} onValueChange={(v) => setApprover(si, ai, { kind: v as "staff" | "role", value: "" })}>
                                                <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="staff">Staff</SelectItem>
                                                    <SelectItem value="role">Role</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {ap.kind === "staff" ? (
                                                <Select value={ap.value} onValueChange={(v) => setApprover(si, ai, { value: v })}>
                                                    <SelectTrigger className="flex-1"><SelectValue placeholder="Choose staff member" /></SelectTrigger>
                                                    <SelectContent>
                                                        {staffs.map((st) => (
                                                            <SelectItem key={st._id} value={st._id}>
                                                                {st.fullName}{st.role ? " (" + st.role + ")" : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <Input className="flex-1" value={ap.value} onChange={(e) => setApprover(si, ai, { value: e.target.value })} placeholder="Role name e.g. manager" />
                                            )}

                                            <Button type="button" variant="ghost" size="icon" onClick={() => removeApprover(si, ai)} disabled={step.approvers.length <= 1}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}

                                    <div className="flex items-center justify-between pt-1">
                                        <Button type="button" variant="outline" size="sm" onClick={() => addApprover(si)}>
                                            <Plus className="mr-1 h-3.5 w-3.5" /> Add approver
                                        </Button>
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs">Require</Label>
                                            <Input type="number" min={1} max={step.approvers.length} value={step.requiredCount} onChange={(e) => setRequiredCount(si, Number(e.target.value))} className="w-16" />
                                            <span className="text-xs text-muted-foreground">of {step.approvers.length}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="rule-default"
                                    checked={ruleForm.isDefault}
                                    onCheckedChange={(v) => setRuleForm((f) => ({ ...f, isDefault: v }))}
                                />
                                <Label htmlFor="rule-default">Default rule</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    id="rule-active"
                                    checked={ruleForm.isActive}
                                    onCheckedChange={(v) => setRuleForm((f) => ({ ...f, isActive: v }))}
                                />
                                <Label htmlFor="rule-active">Active</Label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRuleOpen(false)} disabled={isPending}>
                            Cancel
                        </Button>
                        <Button onClick={saveRule} disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingRule ? "Save Changes" : "Create Rule"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Tabs>
    );
}
