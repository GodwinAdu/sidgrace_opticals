"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Plus, PenLine } from "lucide-react";
import { createConsent, signConsent } from "@/lib/actions/waitlist.actions";

interface Consent {
    _id: string;
    procedureName: string;
    content: string;
    signed: boolean;
    signatureName?: string;
    signedAt?: string | null;
    createdAt?: string;
}

const DEFAULT_TEMPLATE = (proc: string) =>
    `I consent to the procedure "${proc}" at Medira. The nature, purpose, risks, benefits and alternatives have been explained to me and I have had the opportunity to ask questions. I understand no guarantee has been made as to the result of the treatment.`;

export function ConsentManager({ patientId, consents }: { patientId: string; consents: Consent[] }) {
    const router = useRouter();
    const path = usePathname();
    const [procedureName, setProcedureName] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [signName, setSignName] = useState<Record<string, string>>({});
    const [busyId, setBusyId] = useState<string | null>(null);

    const create = async () => {
        if (!procedureName.trim()) return toast.error("Enter a procedure name");
        try {
            setSaving(true);
            await createConsent({
                patientId,
                procedureName: procedureName.trim(),
                content: content.trim() || DEFAULT_TEMPLATE(procedureName.trim()),
            });
            toast.success("Consent form created");
            setProcedureName(""); setContent("");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setSaving(false); }
    };

    const sign = async (id: string) => {
        const name = (signName[id] || "").trim();
        if (!name) return toast.error("Type the signer's full name");
        try {
            setBusyId(id);
            await signConsent(id, name, path);
            toast.success("Consent signed");
            router.refresh();
        } catch { toast.error("Something went wrong"); } finally { setBusyId(null); }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-2">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">New Consent Form</h3>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Procedure</label>
                        <Input value={procedureName} onChange={(e) => setProcedureName(e.target.value)} placeholder="e.g. Tooth extraction" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Consent text (leave blank for default)</label>
                        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Custom consent wording..." />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={create} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Create
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Consent Forms</h3>
                {(!consents || consents.length === 0) && <p className="text-sm text-muted-foreground">No consent forms yet.</p>}
                {consents?.map((c) => (
                    <Card key={c._id}>
                        <CardContent className="space-y-2 pt-5">
                            <div className="flex items-center justify-between">
                                <p className="font-semibold">{c.procedureName}</p>
                                {c.signed
                                    ? <Badge className="bg-green-600">Signed</Badge>
                                    : <Badge variant="outline">Unsigned</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{c.content}</p>
                            {c.signed ? (
                                <p className="text-xs text-green-700">
                                    Signed by {c.signatureName}{c.signedAt ? ` on ${new Date(c.signedAt).toLocaleString()}` : ""}
                                </p>
                            ) : (
                                <div className="flex items-end gap-2 pt-1">
                                    <div className="flex-1">
                                        <label className="mb-1 block text-xs text-muted-foreground">Signature (type full name)</label>
                                        <Input
                                            value={signName[c._id] || ""}
                                            onChange={(e) => setSignName((p) => ({ ...p, [c._id]: e.target.value }))}
                                            placeholder="Patient full name"
                                        />
                                    </div>
                                    <Button size="sm" onClick={() => sign(c._id)} disabled={busyId === c._id}>
                                        {busyId === c._id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PenLine className="mr-1 h-3.5 w-3.5" />}
                                        Sign
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
