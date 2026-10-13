// Define the TypeScript interface for Staff models
interface IStaff extends Document {
    _id?:string;
    fullName: string;
    email: string;
    phone?: string;
    dateOfBirth?: Date;
    gender: "male" | "female" | "non-binary" | "prefer-not-to-say";
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    role: string;
    department?: string;
    specialization?: string;
    licenseNumber?: string;
    startDate: Date;
    bio?: string;
    username: string;
    password: string;
    onLeave?: boolean;
    profileImage?: string | null;
    isActive: boolean;
    requirePasswordChange: boolean;
    sendWelcomeEmail: boolean;
    isBanned: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    del_flag: boolean;
    mod_flag: boolean;
    action_type: "created" | "updated" | "deleted" | "restored";
    createdAt?: Date;
    updatedAt?: Date;
}


interface IDepartment extends Document {
    _id:string;
    name: string;
    description?: string;
    head?: Types.ObjectId; // Reference to Staff who is the head
    employees: Types.ObjectId[]
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    isActive: boolean;
    del_flag: boolean;
    mod_flag: boolean;
    action_type: "created" | "updated" | "deleted" | "restored";
    createdAt?: Date;
    updatedAt?: Date;
}


interface ITrash extends Document {
    _id?:string;
    originalCollection: string;
    document: Record<string, unknown>;
    message?: string;
    deletedBy?: Types.ObjectId;
    deletedAt: Date;
    autoDelete: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IRole {
    _id?:string
    name: string;
    displayName: string;
    description?: string;
    dashboard?: boolean;
    opdManagement?: boolean;
    attendantManagement?: boolean;
    patientManagement?: boolean;
    staffManagement?: boolean;
    appointmentManagement?: boolean;
    accountManagement?: boolean;
    salesManagement?: boolean;
    messaging?: boolean;
    inventoryManagement?: boolean;
    pharmacyManagement?: boolean;
    // Attendance detail tab-level permissions
    attClinical?: boolean;
    attLabScan?: boolean;
    attEyeTest?: boolean;
    attTreatment?: boolean;
    attPrescribe?: boolean;
    attBilling?: boolean;
    attNursing?: boolean;
    // Clinical audit log visibility (gates the visit audit trail tab)
    auditView?: boolean;
    // Inpatient / nursing module permissions
    wardManagement?: boolean;
    admissionManagement?: boolean;
    nursingDashboard?: boolean;
    // Emergency / A&E module permission
    emergencyManagement?: boolean;
    // Operating theatre / surgery module permission
    theatreManagement?: boolean;
    // Maternity / obstetrics module permission
    maternityManagement?: boolean;
    // ICU charting module permission (view/manage; recording reuses attNursing)
    icuManagement?: boolean;
    // Blood bank module permission (register/issue units; specimens reuse labManagement)
    bloodBankManagement?: boolean;
    // Referrals (in/out) module permission
    referralManagement?: boolean;
    // Procurement (requisition → PO → GRN) module permission (reuses inventoryManagement)
    procurementManagement?: boolean;
    // Equipment / biomedical asset register + maintenance module permission
    assetManagement?: boolean;
    // HR module permission (leave + timesheet / attendance)
    hrManagement?: boolean;
    // Payroll module permission (payroll runs → ledger expense)
    payrollManagement?: boolean;
    report?: boolean;
    trash?: boolean;
    history?: boolean;

    addOpd?: boolean;
    manageOpd?: boolean;
    viewOpd?: boolean;
    editOpd?: boolean;
    deleteOpd?: boolean;

    addAttendance?: boolean;
    manageAttendance?: boolean;
    viewAttendance?: boolean;
    editAttendance?: boolean;
    deleteAttendance?: boolean;

    addStaff?: boolean;
    manageStaff?: boolean;
    viewStaff?: boolean;
    editStaff?: boolean;
    deleteStaff?: boolean;

    addPatient?: boolean;
    managePatient?: boolean;
    viewPatient?: boolean;
    editPatient?: boolean;
    deletePatient?: boolean;

    addAppointment?: boolean;
    manageAppointment?: boolean;
    viewAppointment?: boolean;
    editAppointment?: boolean;
    deleteAppointment?: boolean;

    addAccount?: boolean;
    manageAccount?: boolean;
    viewAccount?: boolean;
    editAccount?: boolean;
    deleteAccount?: boolean;

    addSales?: boolean;
    manageSales?: boolean;
    viewSales?: boolean;
    editSales?: boolean;
    deleteSales?: boolean;

    addInventory?: boolean;
    manageInventory?: boolean;
    viewInventory?: boolean;
    editInventory?: boolean;
    deleteInventory?: boolean;

    AccountReport?: boolean;
    inventoryReport?: boolean;
    attendanceReport?: boolean;

    // ── Dental clinic feature permissions ──
    procedureManagement?: boolean;
    dentalChartManagement?: boolean;
    treatmentPlanManagement?: boolean;
    clinicalManagement?: boolean;
    billingManagement?: boolean;
    insuranceManagement?: boolean;
    recallManagement?: boolean;
    labManagement?: boolean;
    rosterManagement?: boolean;
    reportManagement?: boolean;
    branchManagement?: boolean;
    portalAccess?: boolean;

    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;

    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string;

    createdAt?: Date;
    updatedAt?: Date;
}


interface IInventoryCategory extends Document {
    _id?: string;
    schoolId: Types.ObjectId;
    name: string;
    products: Types.ObjectId[];
    storeId?: Types.ObjectId;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt: Date;
    updatedAt: Date;
}


interface IIssueItem {
    categoryId: Types.ObjectId;
    productId: Types.ObjectId;
    quantity: number;
}

interface IInventoryIssue extends Document {
    schoolId: Types.ObjectId;
    role: "Student" | "Employee" | "Parent";
    saleToId: Types.ObjectId;
    issueDate: Date;
    returnDate?: Date;
    status: string;
    issuedBy?: Types.ObjectId;
    issueItems: IIssueItem[];
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt: Date;
    updatedAt: Date;
}


interface IInventoryProduct extends Document {
    _id?: string;
    schoolId: Types.ObjectId;
    name: string;
    categoryId?: Types.ObjectId;
    purchasePrice: number;
    salePrice: number;
    quantity: number;
    // Drug / pharmacy fields (optional; set when the product is a medication)
    isDrug?: boolean;
    strength?: string;
    form?: string;
    unit?: string;
    reorderLevel?: number;
    prescriptionRequired?: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt: Date;
    updatedAt: Date;
}


interface IPurchaseItem {
    products: Types.ObjectId;
    quantity: number;
    discount: number;
}

interface IInventoryPurchase extends Document {
    _id?: string;
    schoolId: Types.ObjectId;
    supplierId: Types.ObjectId;
    storeId: Types.ObjectId;
    status: "Pending" | "Ordered" | "Received" | "Rejected";
    purchaseDate: Date;
    purchaseItems: IPurchaseItem[];
    total?: number;
    transactionId?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface IInventoryStore extends Document {
    _id?: string;
    name: string;
    address: string;
    contactNumber: string;
    categories: Types.ObjectId[];
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt: Date;
    updatedAt: Date;
}




// ═══════════════════════════════════════════════════════════════
//  DENTAL CLINIC FEATURE INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IPrescriptionItem {
    productId?: Types.ObjectId | null;
    drugName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity: number;
    dispensedQuantity?: number;
    instructions?: string;
}

interface IPrescription extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    appointmentId?: Types.ObjectId | null;
    prescribedBy?: Types.ObjectId | null;
    status: "pending" | "partially-dispensed" | "dispensed" | "cancelled";
    items: IPrescriptionItem[];
    notes?: string;
    dispensedBy?: Types.ObjectId | null;
    dispensedAt?: Date | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt: Date;
    updatedAt: Date;
}

// Shared audit fields most dental models carry
// (declared inline per interface to keep them self-contained)

interface IProcedure extends Document {
    _id?: string;
    code: string;            // CDT-style code, e.g. "D2140"
    name: string;
    category: string;        // e.g. "Restorative", "Surgical", "Preventive"
    description?: string;
    defaultDuration: number; // minutes
    price: number;
    isActive: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IToothCondition {
    tooth: number;           // FDI/Universal tooth number
    surface?: string;        // e.g. "M", "O", "D", "B", "L" or "whole"
    condition: string;       // caries | filling | crown | extraction | implant | missing | root-canal | healthy | bridge | sealant
    note?: string;
    recordedAt?: Date;
}

interface IDentalChart extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    numberingSystem: "FDI" | "Universal";
    conditions: IToothCondition[];
    generalNotes?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ITreatmentPlanItem {
    procedureId?: Types.ObjectId;
    procedureName: string;
    tooth?: number;
    surface?: string;
    phase: number;
    cost: number;
    status: "proposed" | "accepted" | "in-progress" | "completed" | "cancelled";
    note?: string;
}

interface ITreatmentPlan extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    title: string;
    items: ITreatmentPlanItem[];
    totalCost: number;
    status: "draft" | "proposed" | "accepted" | "in-progress" | "completed" | "cancelled";
    acceptedByPatient: boolean;
    acceptedAt?: Date;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IPerioMeasurement {
    tooth: number;
    pocketDepth: number[];   // up to 6 sites per tooth
    bleeding: boolean;
    recession?: number;
    mobility?: number;
}

interface IPerioChart extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    appointmentId?: Types.ObjectId | null;
    measurements: IPerioMeasurement[];
    note?: string;
    examinedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IClinicalNote extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    appointmentId?: Types.ObjectId | null;
    teeth: number[];
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
    authoredBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IImaging extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    appointmentId?: Types.ObjectId | null;
    tooth?: number | null;
    type: string;            // "radiograph" | "intraoral-photo" | "panoramic" | "cbct" | "other"
    title: string;
    fileUrl: string;
    note?: string;
    takenAt?: Date;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IPatientDocument extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    type: string;            // "consent" | "scanned-record" | "lab-report" | "insurance" | "identification" | "referral-letter" | "other"
    title: string;
    url: string;             // retrievable URL from the upload pipeline
    fileName?: string;
    mimeType?: string;
    size?: number;
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IInvoiceItem {
    description: string;
    procedureId?: Types.ObjectId;
    tooth?: number;
    quantity: number;
    unitPrice: number;
    amount: number;
}

interface IInvoice extends Document {
    _id?: string;
    invoiceNumber: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    source?: "visit" | "manual" | "plan";
    treatmentPlanId?: Types.ObjectId | null;
    items: IInvoiceItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    amountPaid: number;
    balance: number;
    status: "draft" | "unpaid" | "partial" | "paid" | "cancelled";
    dueDate?: Date;
    notes?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IPayment extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    invoiceId?: Types.ObjectId | null;
    amount: number;
    method: "cash" | "card" | "mobile-money" | "bank-transfer" | "insurance" | "other";
    reference?: string;
    note?: string;
    receivedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IInsurance extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    insurer: string;
    policyNumber: string;
    coveragePercent: number;
    validUntil?: Date;
    notes?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IClaim extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    insuranceId?: Types.ObjectId | null;
    invoiceId?: Types.ObjectId | null;
    claimNumber: string;
    amountClaimed: number;
    amountApproved: number;
    insurerPaid?: boolean;
    status: "draft" | "submitted" | "pre-authorized" | "approved" | "partially-approved" | "rejected" | "paid";
    submittedAt?: Date;
    notes?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ILabTest {
    name: string;
    result?: string;
    unit?: string;
    referenceRange?: string;
    flag?: "normal" | "high" | "low" | "abnormal" | "";
}

interface ILabOrder extends Document {
    _id?: string;
    orderNumber: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    category: "lab" | "radiology";
    tests: ILabTest[];
    status: "ordered" | "collected" | "resulted" | "cancelled";
    note?: string;
    resultNote?: string;
    orderedBy?: Types.ObjectId | null;
    collectedBy?: Types.ObjectId | null;
    resultedBy?: Types.ObjectId | null;
    collectedAt?: Date | null;
    resultedAt?: Date | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  INPATIENT / NURSING INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IWard extends Document {
    _id?: string;
    name: string;
    type: "general" | "private" | "semi-private" | "icu" | "maternity" | "pediatric" | "other";
    dailyRate: number;
    isActive: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IBed extends Document {
    _id?: string;
    label: string;
    wardId: Types.ObjectId;
    status: "vacant" | "occupied" | "maintenance";
    currentAdmissionId?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IBedHistoryEntry {
    wardId: Types.ObjectId;
    bedId: Types.ObjectId;
    from?: Date;
    to?: Date | null;
}

interface IAdmission extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    attendanceId: Types.ObjectId;
    admittingStaff?: Types.ObjectId | null;
    wardId: Types.ObjectId;
    bedId: Types.ObjectId;
    admittedAt: Date;
    expectedDischarge?: Date | null;
    reason?: string;
    status: "admitted" | "discharged";
    dischargedAt?: Date | null;
    dischargeSummary?: string;
    bedHistory?: IBedHistoryEntry[];
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  ICU CHARTING INTERFACE (time-stamped observations on an admission)
// ═══════════════════════════════════════════════════════════════

interface IIcuChartEntry extends Document {
    _id?: string;
    admissionId: Types.ObjectId;
    patientId: Types.ObjectId;
    type: "vitals" | "ventilator" | "gcs" | "fluids" | "note";
    recordedAt: Date;
    // Vitals
    temperature?: number | null;
    pulse?: number | null;
    bloodPressure?: string;
    respiratoryRate?: number | null;
    spo2?: number | null;
    // Ventilator settings
    ventMode?: string;
    fio2?: number | null;
    peep?: number | null;
    tidalVolume?: number | null;
    // Glasgow Coma Scale
    gcsEye?: number | null;
    gcsVerbal?: number | null;
    gcsMotor?: number | null;
    gcsTotal?: number | null;
    // Fluids
    fluidDirection?: "in" | "out" | "";
    fluidKind?: string;
    fluidVolumeMl?: number | null;
    // Shared
    note?: string;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  BLOOD BANK & SPECIMEN TRACKING INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IBloodUnit extends Document {
    _id?: string;
    unitNumber: string;              // human-readable tag, e.g. BU-2026-00001
    bloodGroup: "O-" | "O+" | "A-" | "A+" | "B-" | "B+" | "AB-" | "AB+";
    component: "whole-blood" | "red-cells" | "plasma" | "platelets" | "cryoprecipitate";
    volumeMl?: number | null;
    collectedAt?: Date | null;
    expiry: Date;
    status: "available" | "reserved" | "issued" | "discarded";
    source?: string;                 // donor / supplier reference
    // Set when the unit is reserved/issued to (crossmatched for) a patient.
    patientId?: Types.ObjectId | null;
    crossmatchedBy?: Types.ObjectId | null;
    crossmatchResult?: "compatible" | "incompatible" | "";
    issuedAt?: Date | null;
    issuedBy?: Types.ObjectId | null;
    discardReason?: string;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ISpecimenEvent {
    status: "collected" | "in-transit" | "received" | "processed" | "rejected";
    at?: Date;
    by?: Types.ObjectId | null;
    note?: string;
}

interface ISpecimen extends Document {
    _id?: string;
    specimenNumber: string;          // human-readable tag, e.g. SPEC-2026-00001
    labOrderId: Types.ObjectId;      // the lab order this specimen belongs to
    patientId: Types.ObjectId;       // denormalised from the lab order
    specimenType?: string;           // e.g. "blood", "urine", "swab"
    container?: string;              // e.g. "EDTA tube"
    status: "collected" | "in-transit" | "received" | "processed" | "rejected";
    collectedAt?: Date | null;
    events: ISpecimenEvent[];        // append-only lifecycle trail
    note?: string;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  REFERRALS (IN / OUT) INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IReferral extends Document {
    _id?: string;
    referralNumber: string;          // human-readable tag, e.g. REF-2026-00001
    direction: "in" | "out";         // in = referred to us; out = referred elsewhere
    patientId: Types.ObjectId;       // the referred patient
    attendanceId?: Types.ObjectId | null; // optional visit the referral arose from
    // The other party: where the patient came from (inbound) or is going (outbound).
    facility?: string;               // facility / hospital name
    provider?: string;               // clinician / department
    contact?: string;                // phone / email reference
    reason: string;                  // clinical reason for the referral
    specialty?: string;              // target specialty
    status: "pending" | "accepted" | "declined" | "completed" | "cancelled";
    note?: string;
    referredBy?: Types.ObjectId | null;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  QUEUE MANAGEMENT & BED-TRANSFER APPROVAL INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IQueueTicket extends Document {
    _id?: string;
    service: "opd" | "pharmacy" | "lab"; // the service point that issued the token
    number: number;                      // per-service, per-day token number
    day: string;                         // calendar day (YYYY-MM-DD) numbering resets on
    label?: string;                      // walk-in name / free label when no patient linked
    patientId?: Types.ObjectId | null;
    attendanceId?: Types.ObjectId | null;
    status: "waiting" | "called" | "serving" | "done" | "skipped";
    note?: string;
    calledAt?: Date | null;
    servedAt?: Date | null;
    completedAt?: Date | null;
    issuedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IBedTransfer extends Document {
    _id?: string;
    admissionId: Types.ObjectId;         // the active admission being transferred
    patientId?: Types.ObjectId | null;
    fromWardId?: Types.ObjectId | null;  // snapshot of where the patient is at request time
    fromBedId?: Types.ObjectId | null;
    toWardId?: Types.ObjectId | null;    // requested target ward
    toBedId: Types.ObjectId;             // requested target bed
    reason?: string;
    status: "pending-approval" | "approved" | "rejected";
    decisionNote?: string;
    requestedBy?: Types.ObjectId | null;
    decidedBy?: Types.ObjectId | null;
    decidedAt?: Date | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IRecall extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    type: string;            // "6-month checkup" | "cleaning" | "followup" | etc
    dueDate: Date;
    status: "pending" | "contacted" | "scheduled" | "completed" | "cancelled";
    lastRemindedAt?: Date;
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IWaitlist extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    reason?: string;
    preferredDate?: Date;
    priority: "normal" | "urgent" | "emergency";
    status: "waiting" | "contacted" | "scheduled" | "removed";
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IConsent extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    procedureName: string;
    content: string;
    signed: boolean;
    signatureName?: string;
    signedAt?: Date;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ILabCase extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    labName: string;
    caseType: string;        // "crown" | "denture" | "bridge" | "implant" | etc
    tooth?: number;
    sentDate: Date;
    expectedDate?: Date;
    receivedDate?: Date;
    cost?: number;
    status: "sent" | "in-progress" | "received" | "fitted" | "cancelled";
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IRoster extends Document {
    _id?: string;
    staffId: Types.ObjectId;
    date: Date;
    shiftStart: string;      // "09:00"
    shiftEnd: string;        // "17:00"
    room?: string;           // chair/room label
    branchId?: Types.ObjectId | null;
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IBranch extends Document {
    _id?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}


interface ITransaction extends Document {
    _id?: string;
    type: "income" | "expense";
    category: string;          // e.g. "Consultation", "Procedure", "Rent", "Salaries", "Supplies"
    amount: number;
    accountId?: Types.ObjectId | null;
    accountName?: string;
    date: Date;
    description?: string;
    method?: string;           // cash | card | mobile-money | bank-transfer | insurance | other
    source?: "manual" | "payment" | "invoice" | "purchase" | "attendance";
    sourceId?: Types.ObjectId | null;
    patientId?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}


// ═══════════════════════════════════════════════════════════════
//  STRUCTURED EMR INTERFACES (problems / allergies / immunizations)
// ═══════════════════════════════════════════════════════════════

interface IProblem extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    condition: string;
    icd10Code?: string;
    status: "active" | "resolved";
    onsetDate?: Date | null;
    resolvedDate?: Date | null;
    note?: string;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IAllergy extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    substance: string;
    reaction?: string;
    severity: "mild" | "moderate" | "severe" | "unknown";
    status: "active" | "inactive";
    note?: string;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IImmunization extends Document {
    _id?: string;
    patientId: Types.ObjectId;
    vaccine: string;
    dose?: string;
    administeredDate?: Date | null;
    route?: string;
    site?: string;
    batchNumber?: string;
    note?: string;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  EMERGENCY / A&E INTERFACE
// ═══════════════════════════════════════════════════════════════

interface IEmergencyCase extends Document {
    _id?: string;
    caseNumber: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    triageLevel: string; // ESI 1-5 or immediate/urgent/standard
    chiefComplaint: string;
    bay?: string;
    status: "waiting" | "in-treatment" | "disposed";
    disposition?: "" | "admit" | "discharge" | "refer" | "transfer";
    dispositionNote?: string;
    arrivedAt: Date;
    disposedAt?: Date | null;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}


// ═══════════════════════════════════════════════════════════════
//  OPERATING THEATRE / SURGERY INTERFACES
// ═══════════════════════════════════════════════════════════════

interface ITheatre extends Document {
    _id?: string;
    name: string;
    location?: string;
    isActive: boolean;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ISurgeryCase extends Document {
    _id?: string;
    caseNumber: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    procedureId?: Types.ObjectId | null;
    procedureName?: string;
    surgeons: Types.ObjectId[];
    theatreId: Types.ObjectId;
    scheduledAt: Date;
    durationMinutes: number;
    status: "scheduled" | "in-progress" | "completed" | "cancelled";
    preOpNote?: string;
    postOpNote?: string;
    cost: number;
    billed: boolean;
    invoiceId?: Types.ObjectId | null;
    completedAt?: Date | null;
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
// Maternity / obstetrics (ANC, delivery, newborn)
// ═══════════════════════════════════════════════════════════════

interface IAncVisit {
    _id?: string;
    visitDate: Date;
    gestationalWeeks?: number | null;
    weightKg?: number | null;
    bloodPressure?: string;
    fundalHeightCm?: number | null;
    fetalHeartRate?: number | null;
    notes?: string;
    recordedBy?: Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IAncRecord extends Document {
    _id?: string;
    episodeNumber: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    lmp?: Date | null;
    edd?: Date | null;
    gravida?: number | null;
    para?: number | null;
    bloodGroup?: string;
    riskFactors?: string;
    visits: IAncVisit[];
    status: "active" | "delivered" | "closed";
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface INewborn {
    _id?: string;
    sex?: "male" | "female" | "unknown";
    birthWeightGrams?: number | null;
    apgarScore?: number | null;
    status?: "alive" | "stillbirth" | "deceased";
    notes?: string;
    patientId?: Types.ObjectId | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IDeliveryRecord extends Document {
    _id?: string;
    deliveryNumber: string;
    patientId: Types.ObjectId;
    attendanceId?: Types.ObjectId | null;
    ancRecordId?: Types.ObjectId | null;
    deliveredAt: Date;
    mode: "vaginal" | "assisted-vaginal" | "caesarean" | "vbac" | "other";
    outcome: "live-birth" | "stillbirth" | "miscarriage" | "neonatal-death" | "other";
    attendants: Types.ObjectId[];
    notes?: string;
    babies: INewborn[];
    recordedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag: boolean;
    del_flag: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}


interface IAccount extends Document {
    _id?: string;
    accountName: string;
    balance: number;
    deposits?: Types.ObjectId[];
    expenses?: Types.ObjectId[];
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  PROCUREMENT (REQUISITION → PURCHASE ORDER → GRN) INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IRequisitionItem {
    productId: Types.ObjectId;
    quantity: number;
    note?: string;
}

interface IRequisition extends Document {
    _id?: string;
    requisitionNumber: string;        // human-readable tag, e.g. REQ-2026-00001
    title?: string;
    department?: string;
    storeId?: Types.ObjectId | null;
    items: IRequisitionItem[];
    status: "draft" | "submitted" | "approved" | "rejected";
    reason?: string;
    note?: string;
    requestedBy?: Types.ObjectId | null;
    approvedBy?: Types.ObjectId | null;
    approvedAt?: Date | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IPurchaseOrderItem {
    productId: Types.ObjectId;
    quantity: number;
    unitPrice?: number;
}

interface IPurchaseOrder extends Document {
    _id?: string;
    poNumber: string;                 // human-readable tag, e.g. PO-2026-00001
    requisitionId: Types.ObjectId;    // the approved requisition this PO was raised from
    supplierId: Types.ObjectId;       // reused InventorySupplier
    storeId?: Types.ObjectId | null;
    items: IPurchaseOrderItem[];
    total?: number;
    status: "draft" | "ordered" | "received" | "cancelled";
    expectedDate?: Date | null;
    orderedAt?: Date | null;
    receivedAt?: Date | null;
    note?: string;
    issuedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IGrnItem {
    productId: Types.ObjectId;
    orderedQuantity?: number;
    receivedQuantity: number;
    variance?: number;                // receivedQuantity − orderedQuantity
}

interface IGrn extends Document {
    _id?: string;
    grnNumber: string;                // human-readable tag, e.g. GRN-2026-00001
    purchaseOrderId: Types.ObjectId;  // the PO this receipt is against
    supplierId?: Types.ObjectId | null;
    storeId?: Types.ObjectId | null;
    items: IGrnItem[];
    receivedDate?: Date;
    note?: string;
    receivedBy?: Types.ObjectId | null;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  EQUIPMENT / BIOMEDICAL ASSET + MAINTENANCE INTERFACES
// ═══════════════════════════════════════════════════════════════

interface IMaintenanceRecord {
    _id?: string;
    type?: "preventive" | "corrective" | "calibration" | "inspection";
    description?: string;
    servicedAt?: Date;
    servicedBy?: Types.ObjectId | null;
    cost?: number;
    note?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IAsset extends Document {
    _id?: string;
    assetTag: string;                 // human-readable tag, e.g. AST-2026-00001
    name: string;
    category?: string;
    serialNumber?: string;
    location?: string;                // ward / department
    status: "active" | "maintenance" | "retired";
    scheduleIntervalDays?: number;    // 0 = unscheduled; next-due = lastServiced + interval
    lastServicedAt?: Date | null;
    maintenanceRecords: IMaintenanceRecord[];
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// ═══════════════════════════════════════════════════════════════
//  HR & PAYROLL (LEAVE / TIMESHEET / PAYROLL RUN) INTERFACES
// ═══════════════════════════════════════════════════════════════

interface ILeaveRequest extends Document {
    _id?: string;
    staffId: Types.ObjectId;
    type: "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "other";
    startDate: Date;
    endDate: Date;
    days?: number;                    // inclusive whole-day span
    reason?: string;
    status: "pending" | "approved" | "rejected" | "cancelled";
    approver?: Types.ObjectId | null;
    decidedAt?: Date | null;
    decisionNote?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface ITimesheet extends Document {
    _id?: string;
    staffId: Types.ObjectId;
    date: Date;
    clockIn?: Date | null;
    clockOut?: Date | null;
    hours?: number;                   // daily-entry hours
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

interface IPayAdjustment {
    label?: string;
    amount?: number;
}

interface IPayrollLine {
    _id?: string;
    staffId: Types.ObjectId;
    staffName?: string;               // snapshot at run time
    basePay?: number;
    allowances?: IPayAdjustment[];
    deductions?: IPayAdjustment[];
    gross?: number;                   // max(0, base + allowances − deductions)
}

interface IPayrollRun extends Document {
    _id?: string;
    runNumber: string;                // human-readable tag, e.g. PAY-2026-00001
    periodLabel?: string;
    periodStart: Date;
    periodEnd: Date;
    lines: IPayrollLine[];
    totalBase?: number;
    totalAllowances?: number;
    totalDeductions?: number;
    totalGross?: number;              // amount posted to the ledger
    status: "draft" | "posted";
    transactionId?: Types.ObjectId | null;
    note?: string;
    createdBy?: Types.ObjectId | null;
    modifiedBy?: Types.ObjectId | null;
    deletedBy?: Types.ObjectId | null;
    mod_flag?: boolean;
    del_flag?: boolean;
    action_type?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}
