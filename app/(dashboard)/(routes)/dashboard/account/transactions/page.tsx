import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Heading from "@/app/components/Heading";
import { getTransactions } from "@/lib/actions/transaction.actions";
import { getClinicSettings } from "@/lib/actions/clinic-settings.actions";
import { formatMoney } from "@/lib/utils";

interface Txn {
    _id: string;
    type: "income" | "expense";
    category: string;
    amount: number;
    accountName?: string;
    date?: string;
    description?: string;
    method?: string;
    createdBy?: { fullName?: string } | null;
}

const page = async () => {
    const [txns, settings] = await Promise.all([
        getTransactions({ limit: 200 }) as Promise<Txn[]>,
        getClinicSettings(),
    ]);
    const currency = settings?.currency || "";
    const money = (n: number) => formatMoney(n, currency);
    const income = txns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);

    return (
        <>
            <div className="flex justify-between items-center">
                <Heading title="Transactions" description="Complete ledger of income and expense entries." />
            </div>
            <Separator />

            <div className="grid gap-4 pt-4 sm:grid-cols-3">
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Income</p><p className="text-2xl font-bold text-emerald-600">{money(income)}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Expenses</p><p className="text-2xl font-bold text-red-600">{money(expense)}</p></CardContent></Card>
                <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Net</p><p className="text-2xl font-bold">{money(income - expense)}</p></CardContent></Card>
            </div>

            <Card className="mt-4">
                <CardContent className="pt-6">
                    {txns.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transactions yet. Payments and expenses will appear here.</p>
                    ) : (
                        <div className="divide-y">
                            {txns.map((t) => (
                                <div key={t._id} className="flex items-center justify-between py-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={t.type === "income" ? "secondary" : "outline"} className={t.type === "income" ? "bg-emerald-100 text-emerald-700 border-0" : "bg-red-100 text-red-700 border-0"}>
                                                {t.type}
                                            </Badge>
                                            <span className="text-sm font-medium">{t.category}</span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {t.date ? new Date(t.date).toLocaleDateString() : ""}
                                            {t.accountName ? ` • ${t.accountName}` : ""}
                                            {t.method ? ` • ${t.method}` : ""}
                                            {t.description ? ` • ${t.description}` : ""}
                                        </p>
                                    </div>
                                    <span className={`font-mono text-sm font-semibold ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                                        {t.type === "income" ? "+" : "-"}{money(t.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
};

export default page;
