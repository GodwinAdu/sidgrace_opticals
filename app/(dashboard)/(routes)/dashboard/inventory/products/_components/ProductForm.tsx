"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useParams, usePathname, useRouter } from "next/navigation"
import { createProduct, updateProduct } from "@/lib/actions/inventory-product.actions"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
const formSchema = z.object({
    name: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    categoryId: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    purchasePrice: z.coerce.number(),
    salePrice: z.coerce.number(),
    quantity: z.coerce.number(),
    // General product identifiers (always visible)
    manufacturer: z.string().optional(),
    barcode: z.string().optional(),
    // Pharmacy / drug fields
    isDrug: z.boolean().optional(),
    genericName: z.string().optional(),
    storageConditions: z.string().optional(),
    controlledSubstance: z.boolean().optional(),
    strength: z.string().optional(),
    form: z.string().optional(),
    unit: z.string().optional(),
    reorderLevel: z.coerce.number().optional(),
    prescriptionRequired: z.boolean().optional(),
    // Chart-of-Accounts links (optional; blank persists as null → default fallback)
    inventoryAccountId: z.string().optional(),
    revenueAccountId: z.string().optional(),
    cogsAccountId: z.string().optional(),
    // Stock batches (lot tracking). Dates flow through as "yyyy-MM-dd" strings;
    // the action layer's toDateOrNull handles ISO/date-string coercion.
    batches: z
        .array(
            z.object({
                batchNumber: z.string().optional(),
                expiryDate: z.string().optional(),
                quantity: z.coerce.number().optional(),
                manufactureDate: z.string().optional(),
                costPerUnit: z.coerce.number().optional(),
            })
        )
        .optional(),
})


type ChartAccountOption = { _id: string; code: string; name: string; type: string };

// Format a date value (Date | ISO string | null) to the yyyy-MM-dd value a
// native <input type="date"> expects. Returns "" when the value is empty/invalid.
const toDateInputValue = (value: unknown): string => {
    if (!value) return "";
    const d = new Date(value as string | number | Date);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
};

const ProductForm = ({
    categories,
    type,
    initialData,
    chartAccounts = [],
}: {
    categories: { name: string, _id: string }[],
    type: "create" | "update",
    initialData?: IInventoryProduct,
    chartAccounts?: ChartAccountOption[],
}) => {
    const router = useRouter();
    const path = usePathname();
    const params = useParams();

    // Account linking is gated by `accountingManagement`. When the parent could
    // not fetch the chart (no permission / error), the list is empty and the
    // selects render disabled — the product still saves via default-account
    // fallback at posting time.
    const accountsAvailable = chartAccounts.length > 0;
    const inventoryAccounts = chartAccounts.filter((a) => a.type === "asset");
    const revenueAccounts = chartAccounts.filter((a) => a.type === "revenue");
    const cogsAccounts = chartAccounts.filter((a) => a.type === "expense");
    const ACCOUNT_HINT = "Account linking requires accounting access";

    // 1. Define your form.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema) as never,
        defaultValues: initialData
            ? {
                name: initialData.name ?? "",
                categoryId: String(initialData.categoryId ?? ""),
                purchasePrice: initialData.purchasePrice ?? 0,
                salePrice: initialData.salePrice ?? 0,
                quantity: initialData.quantity ?? 0,
                manufacturer: initialData.manufacturer ?? "",
                barcode: initialData.barcode ?? "",
                isDrug: initialData.isDrug ?? false,
                genericName: initialData.genericName ?? "",
                storageConditions: initialData.storageConditions ?? "",
                controlledSubstance: initialData.controlledSubstance ?? false,
                strength: initialData.strength ?? "",
                form: initialData.form ?? "",
                unit: initialData.unit ?? "",
                reorderLevel: initialData.reorderLevel ?? 0,
                prescriptionRequired: initialData.prescriptionRequired ?? false,
                inventoryAccountId: initialData.inventoryAccountId ? String(initialData.inventoryAccountId) : "",
                revenueAccountId: initialData.revenueAccountId ? String(initialData.revenueAccountId) : "",
                cogsAccountId: initialData.cogsAccountId ? String(initialData.cogsAccountId) : "",
                batches: (initialData.batches ?? []).map((batch) => ({
                    batchNumber: batch.batchNumber ?? "",
                    expiryDate: toDateInputValue(batch.expiryDate),
                    quantity: batch.quantity ?? 0,
                    manufactureDate: toDateInputValue(batch.manufactureDate),
                    costPerUnit: batch.costPerUnit ?? 0,
                })),
            }
            : {
                name: "",
                categoryId: "",
                purchasePrice: 0,
                salePrice: 0,
                quantity: 0,
                manufacturer: "",
                barcode: "",
                isDrug: false,
                genericName: "",
                storageConditions: "",
                controlledSubstance: false,
                strength: "",
                form: "",
                unit: "",
                reorderLevel: 0,
                prescriptionRequired: false,
                inventoryAccountId: "",
                revenueAccountId: "",
                cogsAccountId: "",
                batches: [],
            },
    })

    const {
        fields: batchFields,
        append: appendBatch,
        remove: removeBatch,
    } = useFieldArray({ control: form.control, name: "batches" })

    const isDrug = form.watch("isDrug")

    const { isSubmitting } = form.formState;
    const submit = initialData ? "Update product" : "Create product";
    const submitting = initialData ? "Updating ..." : "Creating ...";
    const productId = initialData?._id as string;

    // 2. Define a submit handler.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "create") {
                await createProduct(values, path)
            }

            if (type === "update") {
                await updateProduct(productId, values, path)
            }
            form.reset()
            router.push(`/dashboard/inventory/products`)
            toast.success(`Product ${type === "create" ? "Create" : "Update"}`,{
                description: `product was ${type === "create" ? "added" : "update"} successfully...`,
            })

        } catch (error) {
            console.error("Failed to submit values  for form schema", error);
            toast.error( "Failed to submit form",{
                description: "Failed to submit form due to an error. Please try again.",
            })

        }
    }
    return (
        <Card>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Product Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Enter Product Name" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Categories</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category._id} value={category._id}>{category.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="purchasePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Purchase Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="salePrice"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sales Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="manufacturer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Manufacturer</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Acme Pharma" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Barcode</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Scan or enter barcode" {...field} value={field.value ?? ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                        </div>

                        {/* Chart-of-Accounts links (gated by accountingManagement) */}
                        <div className="rounded-lg border p-4">
                            <div className="mb-3">
                                <p className="text-sm font-medium">Account linking</p>
                                <p className="text-xs text-muted-foreground">
                                    {accountsAvailable
                                        ? "Optional. Leave blank to use the configured default accounts."
                                        : ACCOUNT_HINT}
                                </p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                <FormField
                                    control={form.control}
                                    name="inventoryAccountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Inventory Account</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value ?? ""}
                                                disabled={!accountsAvailable}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={accountsAvailable ? "Select inventory account" : ACCOUNT_HINT} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {inventoryAccounts.map((account) => (
                                                        <SelectItem key={account._id} value={account._id}>
                                                            {account.code} — {account.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="revenueAccountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Revenue Account</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value ?? ""}
                                                disabled={!accountsAvailable}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={accountsAvailable ? "Select revenue account" : ACCOUNT_HINT} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {revenueAccounts.map((account) => (
                                                        <SelectItem key={account._id} value={account._id}>
                                                            {account.code} — {account.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="cogsAccountId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>COGS Account</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value ?? ""}
                                                disabled={!accountsAvailable}
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder={accountsAvailable ? "Select COGS account" : ACCOUNT_HINT} />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {cogsAccounts.map((account) => (
                                                        <SelectItem key={account._id} value={account._id}>
                                                            {account.code} — {account.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Pharmacy / drug settings */}
                        <div className="rounded-lg border p-4">
                            <FormField
                                control={form.control}
                                name="isDrug"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center gap-3 space-y-0">
                                        <FormControl>
                                            <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                        <FormLabel className="!mt-0 cursor-pointer">
                                            This product is a drug / medication (makes it available to the Pharmacy)
                                        </FormLabel>
                                    </FormItem>
                                )}
                            />

                            {isDrug && (
                                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <FormField
                                        control={form.control}
                                        name="genericName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Generic Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Paracetamol" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="strength"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Strength</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 500mg" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="form"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Form</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Tablet, Syrup, Capsule" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="unit"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Dispense Unit</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. tablet, bottle, pack" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="reorderLevel"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Reorder Level</FormLabel>
                                                <FormControl>
                                                    <Input type="number" placeholder="0" {...field} value={field.value ?? 0} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="storageConditions"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Storage Conditions</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Store below 25°C, away from light" {...field} value={field.value ?? ""} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="prescriptionRequired"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-7">
                                                <FormControl>
                                                    <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="!mt-0 cursor-pointer">Prescription required</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="controlledSubstance"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center gap-3 space-y-0 pt-7">
                                                <FormControl>
                                                    <Checkbox checked={!!field.value} onCheckedChange={field.onChange} />
                                                </FormControl>
                                                <FormLabel className="!mt-0 cursor-pointer">Controlled substance</FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Stock batches (lot tracking) */}
                        <div className="rounded-lg border p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium">Stock batches</p>
                                    <p className="text-xs text-muted-foreground">
                                        Optional. Track received stock by lot for FEFO dispensing and expiry reporting.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        appendBatch({
                                            batchNumber: "",
                                            expiryDate: "",
                                            quantity: 0,
                                            manufactureDate: "",
                                            costPerUnit: 0,
                                        })
                                    }
                                >
                                    Add batch
                                </Button>
                            </div>

                            {batchFields.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No batches added.</p>
                            ) : (
                                <div className="space-y-4">
                                    {batchFields.map((batchField, index) => (
                                        <div key={batchField.id} className="rounded-lg border p-4">
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                                <FormField
                                                    control={form.control}
                                                    name={`batches.${index}.batchNumber`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Lot Number</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="e.g. LOT-2024-001" {...field} value={field.value ?? ""} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`batches.${index}.expiryDate`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Expiry Date</FormLabel>
                                                            <FormControl>
                                                                <Input type="date" {...field} value={field.value ?? ""} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`batches.${index}.quantity`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Quantity</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} value={field.value ?? 0} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`batches.${index}.manufactureDate`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Manufacture Date</FormLabel>
                                                            <FormControl>
                                                                <Input type="date" {...field} value={field.value ?? ""} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`batches.${index}.costPerUnit`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Cost Per Unit</FormLabel>
                                                            <FormControl>
                                                                <Input type="number" placeholder="0" {...field} value={field.value ?? 0} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <div className="flex items-end">
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => removeBatch(index)}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <Button disabled={isSubmitting} type="submit">
                            {isSubmitting ? submitting : submit}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    )
}

export default ProductForm
