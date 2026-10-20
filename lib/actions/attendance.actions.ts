"use server";
import { Types } from 'mongoose';
import { withAuth, type User } from '../helpers/auth';
import Attendance from '../models/attendance.models';
import { connectToDB } from '../mongoose';
import Staff from '../models/staff.models';
import { Patient } from '../models/patient.models';
import { deleteDocument } from './trash.actions';
import { format, startOfDay, endOfDay } from 'date-fns';
import ClinicSettings from '../models/clinic-settings.models';
import { ensureVisitInvoice } from './visit-clinical.actions';
import { resolveCompleteStatus, type VisitStatus } from '../clinical/encounter';
import {
    isMeaningfulChange,
    makeVersion,
    latestVersionContent,
} from '../clinical/attribution';
import { writeVisitAuditEntry } from '../helpers/clinical-audit';

/**
 * Tracked clinical field â†’ its parallel append-only `*Versions` array on the
 * Attendance document. Mirrors the allow-list in
 * `lib/actions/clinical-section.actions.ts` (Task 4). Duplicated here on purpose:
 * that file is a `"use server"` module and importing its `saveClinicalSection`
 * binding (or the type/list) into this server-action module risks a server-action
 * composition / import cycle, so the shared *pure* helpers (`makeVersion`,
 * `isMeaningfulChange`, `latestVersionContent`) and the audit helper are reused
 * instead and the append is performed inline. KEEP THIS LIST IN SYNC with
 * `TRACKED_FIELDS` in `clinical-section.actions.ts`.
 */
const TRACKED_FIELDS = {
    doctorNote: "doctorNoteVersions",
    nurseNote: "nurseNoteVersions",
    surgicalNote: "surgicalNoteVersions",
    history: "historyVersions",
    physicExam: "physicExamVersions",
    diagnosis: "diagnosisVersions",
    plan: "planVersions",
    eyeTest: "eyeTestVersions",
    vitals: "vitalsVersions",
    labReport: "labReportVersions",
    scan: "scanVersions",
} as const;

type TrackedClinicalField = keyof typeof TRACKED_FIELDS;

async function _createAttendance(user: User, values: Record<string, unknown>) {

    try {
        if (!user) throw new Error("User is not authenticated");

        await connectToDB();

        // Validate patientId up-front: a check-in without a valid patient
        // reference must be rejected before any billing side effects.
        if (!values.patientId || !Types.ObjectId.isValid(String(values.patientId))) {
            throw new Error("A valid patientId is required to create an attendance.");
        }

        // Duplicate-visit guard: match ANY attendance for this patient created
        // today (same-DAY range), not an exact timestamp. Exact-timestamp
        // equality never matched, allowing unlimited same-day visits each
        // auto-creating a consultation-fee invoice (billing integrity bug).
        const now = new Date();
        const existingAttendance = await Attendance.findOne({
            patientId: values.patientId,
            date: { $gte: startOfDay(now), $lte: endOfDay(now) },
        });

        if (existingAttendance) throw new Error("Attendance for this patient on this date already exists");

        // Mass-assignment guard (defense-in-depth), mirroring PROTECTED_FIELDS in
        // `_updateAttendanceById`. A check-in must never let the client write
        // identity fields, server-managed audit fields, billing, versioned
        // clinical arrays, or inpatient sub-documents. Work on a shallow copy so
        // the caller's object is untouched.
        const safeValues: Record<string, unknown> = { ...values };
        const PROTECTED_FIELDS = [
            "_id",
            "createdBy",
            "updatedBy",
            "del_flag",
            "mod_flag",
            "action_type",
            "deletedBy",
            "createdAt",
            "updatedAt",
            "billing",
            "doctorNoteVersions",
            "nurseNoteVersions",
            "surgicalNoteVersions",
            "historyVersions",
            "physicExamVersions",
            "diagnosisVersions",
            "planVersions",
            "eyeTestVersions",
            "vitalsVersions",
            "labReportVersions",
            "scanVersions",
            "nursingNotes",
            "medicationAdmin",
            "intakeOutput",
            "icuChart",
            "carePlan",
            "admissionId",
        ];
        for (const protectedKey of PROTECTED_FIELDS) {
            if (protectedKey in safeValues) delete safeValues[protectedKey];
        }

        // Status: a new check-in may only start as "waiting" or "ongoing"; any
        // other value (including "completed"/"cancelled") is forced to "waiting".
        const requestedStatus = safeValues.status;
        if (requestedStatus !== "waiting" && requestedStatus !== "ongoing") {
            safeValues.status = "waiting";
        }

        // visitType: accept only values in the schema enum; otherwise drop it and
        // let the schema default apply (do not throw).
        const VISIT_TYPES = ["new", "follow-up", "procedure", "emergency", "outpatient", "inpatient", ""];
        if ("visitType" in safeValues && !VISIT_TYPES.includes(safeValues.visitType as string)) {
            delete safeValues.visitType;
        }

        // Auto-apply the clinic's default consultation fee to the visit bill at
        // check-in, so the charge is never forgotten by clinical staff. The fee
        // is the single source of truth from clinic settings; accountants can
        // still adjust the bill later via the billing workflow.
        const settings = await ClinicSettings.findOne({ key: "clinic" });
        const consultationFee = Number(settings?.defaultConsultationFee) || 0;

        const attendance = new Attendance({
            ...safeValues,
            date: new Date(),
            createdBy: user._id,
            billing: {
                consultationFee,
                proceduresTotal: 0,
                productsTotal: 0,
                otherCharges: [],
                totalCharged: consultationFee,
                amountPaid: 0,
                balance: consultationFee,
            },
        });
        await attendance.save();

        // Open the visit's invoice immediately so the billing page always has a
        // target and every later charge syncs onto a guaranteed invoice.
        // Best-effort: never block check-in if invoice creation fails.
        try {
            const inv = await ensureVisitInvoice(String(attendance._id));
            if (inv?._id) {
                attendance.set("billing.invoiceId", inv._id);
                attendance.set("billing.invoiceNumber", inv.invoiceNumber);
                attendance.set("billing.balance", Number(inv.balance) || consultationFee);
                await attendance.save();
            }
        } catch (invoiceError) {
            console.error("Visit invoice not created at check-in (non-blocking):", invoiceError);
        }

        // Return the created doc (id) so callers can navigate to the visit.
        return JSON.parse(JSON.stringify(attendance));
    } catch (error) {
        console.error("Error creating attendance", error);
        throw error;

    }
}


export const createAttendance = await withAuth(_createAttendance, "opdManagement");

async function _getAttendanceById(user: User, id: string) {
    if (!user || !user._id) {
        throw new Error("Unauthorized: User is not authenticated.");
    }
    await connectToDB();
    if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid attendance ID.");
    }
    try {
        const attendance = await Attendance.findById(id)
            .populate([
                { path: 'patientId', model: Patient },
                { path: 'createdBy', model: Staff, select: 'fullName' }
            ])
        if (!attendance) {
            throw new Error("Attendance not found.");
        }
        return JSON.parse(JSON.stringify(attendance));
    } catch (err) {
        console.error("Failed to fetch attendance:", err);
        throw new Error("Unable to fetch attendance. Please try again later.");
    }
}
export const getAttendanceById = await withAuth(_getAttendanceById);



async function _getAllAttendances(user: User) {
    if (!user || !user._id) {
        throw new Error("Unauthorized: User is not authenticated.");
    }
    await connectToDB();
    const date = new Date();
    try {
        const attendances = await Attendance.find({
            date: {
                $gte: new Date(date.setHours(0, 0, 0, 0)),
                $lt: new Date(date.setHours(23, 59, 59, 999))
            }
        })
            .populate([{
                path: 'patientId',
                model: Patient,
                select: 'fullName'
            }, {
                path: 'createdBy',
                model: Staff,
                select: 'fullName'
            }])
            .sort({ date: -1 })
            .exec();

        if (!attendances || attendances.length === 0) return [];

        const filterAttendance = attendances.map(data => ({
            _id: data._id,
            patient: data.patientId.fullName,
            visitDate:format(data.date,"PPP"),
            status: data.status,
            ...data._doc
        }));

        console.log(filterAttendance,"filter")

        // Convert Mongoose documents to plain objects
        return JSON.parse(JSON.stringify(filterAttendance));
    } catch (err) {
        console.error("Failed to fetch attendances:", err);
        throw new Error("Unable to fetch attendances. Please try again later.");
    }
}
export const getAllAttendances = await withAuth(_getAllAttendances);

export async function getPreviousVisitsByPatientId(patientId: string, excludeId?: string) {
    try {
        await connectToDB()

        // Build query to find visits for this patient
        const query: Record<string, unknown> = {
            patientId: patientId,  // Find all visits for this specific patient
            status: { $in: ['completed', 'ongoing', 'cancelled', 'waiting'] }, // Only show past visits (not pending new ones)
        }

        // Exclude the current visit from the "previous visits" list when provided
        if (excludeId) {
            query._id = { $ne: excludeId }
        }


        const previousVisits = await Attendance.find(query)
            .select('_id date status visitType diagnosis') // list fields + a reason hint
            .sort({ date: -1 }) // Sort by date, newest first
            .limit(10) // Only get last 10 visits (for performance)
            .lean() // Return plain JavaScript objects (faster)

        // Convert MongoDB ObjectIds to strings for JSON serialization
        return previousVisits.map(visit => ({
            ...visit,
            _id: (visit._id as Types.ObjectId | string).toString(),
        }))
    } catch (error) {
        console.error('Error fetching previous visits:', error)
        return [] // Return empty array if error occurs
    }
}


async function _updateAttendanceById(
    user: User,
    id: string,
    values: Record<string, unknown>
) {
    if (!user || !user._id) {
        throw new Error("Unauthorized: User is not authenticated.");
    }

    await connectToDB();

    const { ...updateFields } = values;

    if (!Types.ObjectId.isValid(id)) {
        throw new Error("Invalid attendance ID.");
    }

    // Append updatedBy field to the update object
    updateFields.updatedBy = user._id;

    // Mass-assignment guard (defense-in-depth). This generic save path must
    // never write identity fields or clinical sub-documents that have their own
    // dedicated, permission-gated actions. The encounter Complete/Sign flow posts
    // the whole working document, so without this strip a client could escalate
    // by injecting e.g. nursingNotes (needs attNursing) or reassign patientId.
    // Tracked clinical fields are routed through the attributed append-only path
    // below and are intentionally NOT in this list.
    const PROTECTED_FIELDS = [
        "_id",
        "patientId",
        "createdBy",
        "del_flag",
        "mod_flag",
        "action_type",
        "deletedBy",
        "createdAt",
        "updatedAt",
        "nursingNotes",
        "medicationAdmin",
        "intakeOutput",
        "icuChart",
        "carePlan",
        "doctorNoteVersions",
        "nurseNoteVersions",
        "surgicalNoteVersions",
        "historyVersions",
        "physicExamVersions",
        "diagnosisVersions",
        "planVersions",
        "eyeTestVersions",
        "vitalsVersions",
        "labReportVersions",
        "scanVersions",
    ];
    for (const protectedKey of PROTECTED_FIELDS) {
        if (protectedKey in updateFields) delete updateFields[protectedKey];
    }

    // Status-on-save fix (Req 4.3): a plain record Save must NOT silently
    // complete the visit. Previously this action unconditionally forced
    // `status = "completed"` on every call. Now status is taken from the
    // payload and, when the payload omits it, the current status is preserved
    // by simply not writing the field. The explicit footer "Complete Visit"
    // action completes a visit by passing `status: "completed"` (see
    // `completeVisit` below). The pure decision rule lives in
    // `resolveSaveStatus` in `lib/clinical/encounter.ts` and is unit-tested.
    const requestedStatus = updateFields.status as VisitStatus | undefined;
    const validStatuses: VisitStatus[] = ["waiting", "ongoing", "completed", "cancelled"];
    if (requestedStatus === undefined || requestedStatus === null) {
        // No status requested â†’ preserve current status (omit from the $set).
        delete updateFields.status;
    } else if (!validStatuses.includes(requestedStatus)) {
        // Guard against invalid status values leaking into the update.
        delete updateFields.status;
    }

    try {
        // Split the payload: any tracked clinical field present must NOT be
        // blindly `$set` (that would overwrite the versioned content WITHOUT
        // attribution â€” R2.2 / R7.1). Instead those fields route through the
        // attributed, append-only path (one version per field, each carrying its
        // own author from the authenticated `user` and a server timestamp â€”
        // R1.2 / R1.4). Non-tracked fields keep the exact existing `$set`
        // behavior. We remove tracked keys from `updateFields` so they are never
        // also blindly overwritten.
        const trackedUpdates: { field: TrackedClinicalField; versionsField: string; content: unknown }[] = [];
        for (const key of Object.keys(updateFields)) {
            if (Object.prototype.hasOwnProperty.call(TRACKED_FIELDS, key)) {
                const field = key as TrackedClinicalField;
                trackedUpdates.push({
                    field,
                    versionsField: TRACKED_FIELDS[field],
                    content: updateFields[key],
                });
                // Keep tracked fields out of the blind `$set`.
                delete updateFields[key];
            }
        }

        // Route tracked fields through the attributed append-only path. This
        // mirrors `saveClinicalSection` (Task 4) using the SAME shared helpers
        // (`makeVersion` / `isMeaningfulChange` / `latestVersionContent` and
        // `writeVisitAuditEntry`), without importing that server-action file â€”
        // avoiding a server-action/import cycle. The clinical content is written
        // atomically within a single `visit.save()`; the audit entry is
        // best-effort afterward (R7.3).
        if (trackedUpdates.length > 0) {
            const visit = await Attendance.findById(id);
            if (!visit) {
                throw new Error("Attendance not found.");
            }

            // Preserve the status-on-save guarantee here too: only apply a
            // requested, valid status; otherwise leave the current status
            // untouched (a plain Save never completes a visit â€” R6.4).
            if (requestedStatus !== undefined && requestedStatus !== null && validStatuses.includes(requestedStatus)) {
                visit.status = requestedStatus as never;
            }
            // Preserve the existing `updatedBy` behavior on the document itself.
            visit.updatedBy = user._id as never;

            const auditWrites: { field: TrackedClinicalField; versionIndex: number }[] = [];
            const now = new Date();
            for (const { field, versionsField, content } of trackedUpdates) {
                if (!Array.isArray(visit[versionsField])) {
                    visit[versionsField] = [] as never;
                }
                // No-op guard: a save identical to the latest version does not
                // append a redundant version (R2.4).
                const latest = latestVersionContent(visit[versionsField]);
                if (!isMeaningfulChange(latest, content)) {
                    continue;
                }
                // Append-only: push a fresh attributed version; never replace or
                // mutate prior versions (R2.1 / R2.2 / R7.1). Author/time come
                // from the injected `user` + server clock (R1.2 / R1.4).
                visit[versionsField].push(makeVersion(content, user, now) as never);
                visit.markModified(versionsField);
                // Materialise the scalar as the latest value for back-compat
                // reads (R2.3).
                visit[field] = content as never;
                auditWrites.push({ field, versionIndex: visit[versionsField].length - 1 });
            }

            await visit.save();

            // Best-effort audit entries; never roll back the clinical write (R7.3).
            for (const { field, versionIndex } of auditWrites) {
                await writeVisitAuditEntry({
                    attendanceId: id,
                    performedBy: String(user?._id ?? user?.id ?? ""),
                    details: { field, versionIndex },
                    message: `Clinical section "${field}" recorded`,
                });
            }

            // Apply any remaining non-tracked fields via the existing `$set`
            // path so their behavior is unchanged. When there are none we still
            // return the freshly-saved document.
            const hasNonTracked = Object.keys(updateFields).some(
                (k) => k !== "updatedBy" && k !== "status",
            );
            if (hasNonTracked) {
                const updatedAttendance = await Attendance.findByIdAndUpdate(
                    id,
                    { $set: updateFields },
                    { new: true, runValidators: true },
                );
                if (!updatedAttendance) {
                    throw new Error("Attendance not found.");
                }
                return JSON.parse(JSON.stringify(updatedAttendance));
            }

            return JSON.parse(JSON.stringify(visit));
        }

        // No tracked fields in the payload â†’ unchanged legacy `$set` path.
        const updatedAttendance = await Attendance.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedAttendance) {
            throw new Error("Attendance not found.");
        }

        return JSON.parse(JSON.stringify(updatedAttendance));
    } catch (err) {
        console.error("Failed to update attendance:", err);
        throw new Error("Unable to update attendance. Please try again later.");
    }
}

export const updateAttendance = await withAuth(_updateAttendanceById);


/**
 * Explicit "Complete Visit" save (Req 4.3 / 9.1). Used ONLY by the encounter
 * footer's Complete action â€” it persists the aggregated fields like a normal
 * save but intentionally sets `status: "completed"`. Reuses `_updateAttendanceById`
 * so the same validation/auth path applies; the resolved completed status comes
 * from the pure `resolveCompleteStatus` helper, keeping Complete explicit and
 * idempotent (completing an already-completed visit is a no-op on status).
 */
async function _completeVisit(
    user: User,
    id: string,
    values: Record<string, unknown> = {}
) {
    const completedStatus: VisitStatus = resolveCompleteStatus();
    return _updateAttendanceById(user, id, { ...values, status: completedStatus });
}

export const completeVisit = await withAuth(_completeVisit);


export async function updateUserAttendance(id: string) {
    try {
        await connectToDB();

        const updateFields = {
            status: "ongoing"
        }

        const updatedAttendance = await Attendance.findByIdAndUpdate(
            id,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updatedAttendance) {
            throw new Error("Attendance not found.");
        }

        return JSON.parse(JSON.stringify(updatedAttendance));
    } catch (error) {
        throw error
    }
}


async function _deleteAttendance(user: User, id: string) {
    try {
        if (!user) throw new Error("User not authenticated")

        await connectToDB()

        const patient = await Attendance.findById(id)

        await deleteDocument({
            actionType: 'ATTENDANCE_DELETED',
            documentId: patient._id,
            collectionName: 'Attendance',
            userId: `${user?._id}`,
            trashMessage: `Attendance with (ID: ${id}) was moved to trash by ${user.fullName}.`,
            historyMessage: `User ${user.fullName} deleted Attendance with (ID: ${id}) on ${new Date().toLocaleString()}.`
        });

        return { success: true, message: "Attendance deleted successfully" };
    } catch (error) {
        console.log("error while deleting Attendance", error)
        throw error;
    }
}

export const deleteAttendance = await withAuth(_deleteAttendance, "deleteAttendance")
