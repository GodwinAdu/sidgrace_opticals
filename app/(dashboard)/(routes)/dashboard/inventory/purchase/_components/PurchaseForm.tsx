"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, useWatch } from "react-hook-form"
import { z } from "zod";
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
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useParams, usePathname, useRouter } from "next/navigation";
import { createPurchase, updatePurchase } from "@/lib/actions/inventory-purchase.actions";
import { toast } from "sonner";

const formSchema = z.object({
    supplierId: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    storeId: z.string().min(2, {
        message: "Username must be at least 2 characters.",
    }),
    status: z.string().optional(),
    purchaseDate: z.coerce.date(),
    purchaseItems: z
        .array(
            z.object({
                products: z.string().min(2, { message: "Please specify product type" }),
                quantity: z.coerce.number(),
                discount: z.coerce.number(),
            })
        ),
});

interface PurchaseProps {
    type: "create" | "update";
    initialData?: IInventoryPurchase;
    stores: { _id: string, name: string }[];
    suppliers: { _id: string, name: string }[];
    products: { _id: string, name: string, purchasePrice: number }[];
}

const PurchaseForm = ({ stores, suppliers, products, type, initialData }: PurchaseProps) => {

    const router = useRouter();
    const path = usePathname();
    const params = useParams();

    const { schoolId, userId } = params;

    const purchaseId = initialData?._id as string;

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: initialData ?? {
            supplierId: "",
            storeId: "",
            purchaseDate: new Date(),
            purchaseItems: [{ products: "", quantity: 1, discount: 0 }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        name: "purchaseItems",
        control: form.control,
    });

    const watchPurchaseItems = useWatch({
        control: form.control,
        name: "purchaseItems",
    }) || [];

    const calculateTotalPrice = (index: number) => {
        const item = watchPurchaseItems[index];
        if (!item) return 0;
        const product = products.find(p => p._id === item.products);
        if (!product) return 0;
        const quantity = item.quantity || 1
        const unitPrice = product.purchasePrice;
        const discount = item.discount || 0;
        return quantity * (unitPrice - discount);
    };

    const calculateNetTotal = () => {
        return watchPurchaseItems?.reduce((total, item, index) => {
            return total + calculateTotalPrice(index);
        }, 0);
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            if (type === "create") {
                await createPurchase(values, path)
            }
            if (type === "update") {
                await updatePurchase(purchaseId, values, path)
            }

            form.reset();
            router.push(`/dashboard/inventory/purchase`)
            toast( "Purchase updated",{
                description: "Purchase was updated successfully...",
            });
        } catch (error) {
            console.log(error)

            toast.error("Something went wrong",{
                description: "An error occurred while submitting your form. Please try again later.",
            });
        }
    }

    return (
        <Card>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <Card className="w-[95%] max-w-2xl mt-4 mx-auto">
                            <CardContent className="space-y-6 py-4">
                                <FormField
                                    control={form.control}
                                    name="supplierId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Choose a Supplier</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a supplier" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {suppliers.map(supplier => (
                                                        <SelectItem key={supplier._id} value={supplier._id}>{supplier.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="storeId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Select a Store</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a store" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {stores.map(store => (
                                                        <SelectItem key={store._id} value={store._id}>{store.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {type === "update" && (
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Purchase Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Pending">Pending</SelectItem>
                                                        <SelectItem value="Ordered">Ordered</SelectItem>
                                                        <SelectItem value="Received">Received</SelectItem>
                                                        <SelectItem value="Rejected">Rejected</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                                <FormField
                                    control={form.control}
                                    name="purchaseDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Date of Purchase</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-[240px] pl-3 text-left font-normal",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            {field.value ? (
                                                                format(field.value, "PPP")
                                                            ) : (
                                                                <span>Pick a date</span>
                                                            )}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={field.onChange}
                                                        disabled={(date) =>
                                                            date < new Date()
                                                        }
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="py-4">
                                {fields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-1 md:grid-cols-5 gap-6 py-4">
                                        <FormField
                                            control={form.control}
                                            name={`purchaseItems.${index}.products`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={cn(index !== 0 && "sr-only")}>Product</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a product" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {products.map((product) => (
                                                                <SelectItem key={product._id} value={product._id}>{product.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="grid w-full items-center gap-1.5">
                                            <Label htmlFor={`price-${index}`} className={cn(index !== 0 && "sr-only")}>Unit Price</Label>
                                            <Input
                                                type="text"
                                                id={`price-${index}`}
                                                value={products.find(p => p._id === watchPurchaseItems[index]?.products)?.purchasePrice || 0}
                                                readOnly
                                                className="bg-gray-200"
                                                disabled
                                            />
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name={`purchaseItems.${index}.quantity`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={cn(index !== 0 && "sr-only")}>Quantity</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min={1} {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`purchaseItems.${index}.discount`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className={cn(index !== 0 && "sr-only")}>Discount</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <div className="flex gap-5">
                                            <div className="grid w-full items-center gap-1.5">
                                                <Label htmlFor={`total-price-${index}`} className={cn(index !== 0 && "sr-only")}>Total Price</Label>
                                                <Input
                                                    type="text"
                                                    id={`total-price-${index}`}
                                                    value={calculateTotalPrice(index)}
                                                    readOnly
                                                />
                                            </div>
                                            {index !== 0 && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                <div className="flex justify-between items-center mt-3">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="mt-2"
                                        onClick={() => append({ products: "", quantity: 1, discount: 0 })}
                                    >
                                        New Form
                                    </Button>
                                    <div className="grid items-center gap-1.5">
                                        <Label htmlFor="net-total">Net Total</Label>
                                        <Input
                                            type="text"
                                            id="net-total"
                                            value={calculateNetTotal()}
                                            readOnly
                                            disabled
                                            className="bg-gray-200"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Button type="submit">Submit</Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default PurchaseForm;
