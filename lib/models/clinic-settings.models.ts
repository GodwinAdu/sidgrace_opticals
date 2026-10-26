import { Schema, model, models, Model } from "mongoose";

/**
 * Singleton-ish clinic settings document. We keep one settings doc and
 * read/update it. Holds clinic-wide defaults such as the standard
 * consultation fee that pre-fills the visit billing field.
 */
const ClinicSettingsSchema = new Schema(
    {
        key: { type: String, default: "clinic", unique: true },
        defaultConsultationFee: { type: Number, default: 0 },
        currency: { type: String, default: "" },
        // Clinic/hospital identity used on invoices, receipts and report headers.
        clinicName: { type: String, default: "Dapfam Dental Clinic" },
        clinicAddress: { type: String, default: "" },
        clinicPhone: { type: String, default: "" },
        clinicEmail: { type: String, default: "" },
        clinicLogoUrl: { type: String, default: "" },
        // ─────────── Epson ePOS-Print (networked thermal receipt printer) ───────────
        // When enabled, the invoice "Quick Print (Epson)" button POSTs an ePOS XML
        // job straight to the printer's own web endpoint — no driver/dialog. The
        // device address is the printer's IP; the endpoint path is its ePOS service.
        eposEnabled: { type: Boolean, default: false },
        // e.g. "http://192.168.1.50" (printer IP). Keep http unless the printer
        // serves https with a trusted cert (self-signed certs block fetch).
        eposPrinterUrl: { type: String, default: "" },
        // The printer's device id as configured in its ePOS-Print settings.
        eposDeviceId: { type: String, default: "local_printer" },
        // Kick the cash drawer after printing a paid receipt.
        eposOpenDrawer: { type: Boolean, default: false },
        modifiedBy: { type: Schema.Types.ObjectId, ref: "Staff", default: null },
    },
    { timestamps: true }
);

const ClinicSettings: Model<Record<string, unknown>> =
    (models.ClinicSettings as Model<Record<string, unknown>>) ??
    model("ClinicSettings", ClinicSettingsSchema);

export default ClinicSettings;
