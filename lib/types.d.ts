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
    schoolId: Types.ObjectId;
    name: string;
    categoryId?: Types.ObjectId;
    purchasePrice: number;
    salePrice: number;
    quantity: number;
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
    product: Types.ObjectId;
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
