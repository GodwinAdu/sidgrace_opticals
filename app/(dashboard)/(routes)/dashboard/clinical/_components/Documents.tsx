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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/file-upload";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Upload, Trash2, FileText, ShieldCheck } from "lucide-react";
import {
    createPatientDocument,
    deletePatientDocument,
} from "@/lib/actions/patient-document.actions";
import { uploadFile } from "@/lib/actions/upload.actions";
import {
    DOCUMENT_TYPES,
    documentTypeLabel,
    filterConsents,
    groupByType,
} from "@/lib/clinical/document";
import { VisitPicker, type VisitOption } from "./VisitPicker";

interface PatientDoc {
    _id: string;
    type: string;
    title: string;
    url: string;
    fileName?: string;
    mimeType?: string;
    size?: number;
    note?: string;
    createdAt?: string;
}

export function Documents({
    patientId,
    documents,
    appointments = [],
}: {
    patientId: string;
    documents: PatientDoc[];
    appointments?: VisitOption[];
}) {
    const router = useRouter();
    const path = usePathname();
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [type, setType] = useState<string>("consent");
    const [note, setNote] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [appointmentId, setAppointmentId] = useState("");

    const groups = useMemo(() => groupByType(documents || []), [documents]);
    const consents = useMemo(() => filterConsents(documents || []), [documents]);

    const save = async () => {
        if (!title.trim()) {
            toast.error("Enter a title");
            return;
        }
        if (!file) {
            toast.error("Choose a file", { description: "Upload a scan, consent or document (image or PDF)." });
            return;
        }
        try {
            setSaving(true);

            // Reuse the shared upload pipeline: it takes a `file` FormData field
            // and returns a retrievable URL — the DB stores only that URL.
            const fd = new FormData();
            fd.append("file", file);
            fd.append("keyHint", patientId);
            const uploaded = await uploadFile(fd);

            await createPatientDocument(
                {
                    patientId,
                    type,
                    title: title.trim(),
                    url: uploaded.url,
                    fileName: uploaded.name,
                    mimeType: uploaded.type,
                    size: uploaded.size,
                    note: note.trim(),
                    attendanceId: appointmentId || null,
                },
                path
            );

            toast.success("Document saved");
            setTitle("");
            setNote("");
            setFile(null);
            setType("consent");
            setAppointmentId("");
            router.refresh();
        } catch {
            toast.error("Something went wrong", { description: "Could not upload the document." });
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deletePatientDocument(id);
            toast.success("Document moved to trash");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    const renderDoc = (doc: PatientDoc) => (
        <Card key={doc._id}>
            <CardContent className="flex items-start gap-3 pt-4">
                <FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate text-sm font-semibold hover:underline"
                        >
                            {doc.title}
                        </a>
                        <button
                            onClick={() => remove(doc._id)}
                            disabled={busyId === doc._id}
                            className="shrink-0 text-red-500 hover:text-red-700"
                            aria-label="Delete document"
                        >
                            {busyId === doc._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        {documentTypeLabel(doc.type)}
                        {doc.createdAt ? ` • ${new Date(doc.createdAt).toLocaleDateString()}` : ""}
                        {doc.fileName ? ` • ${doc.fileName}` : ""}
                    </p>
                    {doc.note && <p className="mt-1 text-xs text-muted-foreground">{doc.note}</p>}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upload Document</h3>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Surgical consent form" />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {DOCUMENT_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">File (image or PDF, max 15MB)</label>
                        <FileUpload
                            value={file}
                            onChange={setFile}
                            onError={(e) => toast.error(e)}
                            accept={{
                                "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
                                "application/pdf": [".pdf"],
                            }}
                            maxSize={15 * 1024 * 1024}
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Note</label>
                        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
                    </div>
                    {appointments.length > 0 && (
                        <VisitPicker appointments={appointments} value={appointmentId} onChange={setAppointmentId} />
                    )}
                    <div className="flex justify-end">
                        <Button onClick={save} disabled={saving}>
                            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {saving ? "Uploading..." : "Save Document"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div>
                <Tabs defaultValue="all" className="w-full">
                    <TabsList>
                        <TabsTrigger value="all">All Documents ({documents?.length || 0})</TabsTrigger>
                        <TabsTrigger value="consents">
                            <ShieldCheck className="mr-1 h-4 w-4" />
                            Consent Archive ({consents.length})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="pt-4">
                        {(!documents || documents.length === 0) ? (
                            <p className="text-sm text-muted-foreground">No documents on file yet.</p>
                        ) : (
                            <div className="space-y-6">
                                {groups.map((g) => (
                                    <div key={g.type}>
                                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            {g.label} ({g.documents.length})
                                        </h4>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {g.documents.map(renderDoc)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="consents" className="pt-4">
                        {consents.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No signed consents archived yet.</p>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2">
                                {consents.map(renderDoc)}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
