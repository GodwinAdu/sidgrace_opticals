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


