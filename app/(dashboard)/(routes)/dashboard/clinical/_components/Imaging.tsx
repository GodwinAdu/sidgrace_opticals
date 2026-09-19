"use client";

import { useState } from "react";
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
import { FileUpload } from "@/components/file-upload";
import { toast } from "sonner";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { createImaging, deleteImaging } from "@/lib/actions/imaging.actions";
import { VisitPicker, type VisitOption } from "./VisitPicker";

interface ImageDoc {
    _id: string;
    tooth?: number | null;
    type: string;
    title: string;
    fileUrl: string;
    note?: string;
    createdAt?: string;
}

const TYPES = [
    { value: "radiograph", label: "Radiograph (X-ray)" },
    { value: "intraoral-photo", label: "Intraoral Photo" },
    { value: "panoramic", label: "Panoramic" },
    { value: "cbct", label: "CBCT / 3D" },
    { value: "other", label: "Other" },
];

// Keep data-URL storage modest since there is no external file store configured.
const MAX_INLINE = 1.5 * 1024 * 1024; // 1.5MB

export function Imaging({ patientId, images, appointments = [] }: { patientId: string; images: ImageDoc[]; appointments?: VisitOption[] }) {
    const router = useRouter();
    const path = usePathname();
    const [saving, setSaving] = useState(false);
    const [busyId, setBusyId] = useState<string | null>(null);

    const [title, setTitle] = useState("");
    const [type, setType] = useState("radiograph");
    const [tooth, setTooth] = useState("");
    const [note, setNote] = useState("");
    const [url, setUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [appointmentId, setAppointmentId] = useState("");

    const fileToDataUrl = (f: File) =>
        new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(f);
        });

    const save = async () => {
        if (!title.trim()) {
            toast.error("Enter a title");
            return;
        }
        let fileUrl = url.trim();
        if (!fileUrl && file) {
            if (file.size > MAX_INLINE) {
                toast.error("Image too large", { description: "Use an image under 1.5MB or paste an image URL instead." });
                return;
            }
            fileUrl = await fileToDataUrl(file);
        }
        if (!fileUrl) {
            toast.error("Add an image", { description: "Upload a file or paste an image URL." });
            return;
        }
        try {
            setSaving(true);
            await createImaging(
                patientId,
                { title: title.trim(), type, tooth: tooth ? Number(tooth) : null, note, fileUrl, appointmentId: appointmentId || null },
                path
            );
            toast.success("Imaging saved");
            setTitle(""); setTooth(""); setNote(""); setUrl(""); setFile(null); setType("radiograph"); setAppointmentId("");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        try {
            setBusyId(id);
            await deleteImaging(id);
            toast.success("Imaging moved to trash");
            router.refresh();
        } catch {
            toast.error("Something went wrong");
        } finally {
            setBusyId(null);
        }
    };

    return (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add Imaging</h3>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bitewing right molars" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Type</label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs text-muted-foreground">Tooth (optional)</label>
                            <Input value={tooth} onChange={(e) => setTooth(e.target.value)} placeholder="e.g. 14" />
                        </div>
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Upload image (max 1.5MB)</label>
                        <FileUpload value={file} onChange={setFile} onError={(e) => toast.error(e)} />
                    </div>
                    <div>
                        <label className="mb-1 block text-xs text-muted-foreground">…or paste an image URL</label>
                        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
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
                            {saving ? "Saving..." : "Save Imaging"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Gallery</h3>
                {(!images || images.length === 0) ? (
                    <p className="text-sm text-muted-foreground">No imaging attached yet.</p>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {images.map((img) => (
                            <Card key={img._id} className="overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={img.fileUrl} alt={img.title} className="h-40 w-full object-cover" />
                                <CardContent className="space-y-1 pt-3">
                                    <div className="flex items-start justify-between">
                                        <p className="text-sm font-semibold">{img.title}</p>
                                        <button onClick={() => remove(img._id)} disabled={busyId === img._id} className="text-red-500 hover:text-red-700">
                                            {busyId === img._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {img.type}{img.tooth ? ` • Tooth ${img.tooth}` : ""}
                                        {img.createdAt ? ` • ${new Date(img.createdAt).toLocaleDateString()}` : ""}
                                    </p>
                                    {img.note && <p className="text-xs text-muted-foreground">{img.note}</p>}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
