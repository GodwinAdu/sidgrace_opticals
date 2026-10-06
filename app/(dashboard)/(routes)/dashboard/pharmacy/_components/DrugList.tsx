"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { formatMoney } from "@/lib/utils";

interface Drug {
    _id: string;
    name: string;
    strength?: string;
    form?: string;
    unit?: string;
    salePrice?: number;
    quantity?: number;
    reorderLevel?: number;
    prescriptionRequired?: boolean;
    categoryId?: { name?: string } | string | null;
}

export function DrugList({ drugs, currency = "" }: { drugs: Drug[]; currency?: string }) {
    if (!drugs || drugs.length === 0) {
        return (
            <Card>
                <CardContent className="py-12 text-center text-sm text-muted-foreground">
                    No drugs yet. In Inventory → Products, create a product and mark it as a drug to list it here.
                    <div className="mt-3">
                        <Link href="/dashboard/inventory/products" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                            <Plus className="mr-2 h-4 w-4" /> Add in Inventory
                        </Link>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Drug</TableHead>
                                <TableHead>Form</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-center">In Stock</TableHead>
                                <TableHead className="text-center">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {drugs.map((d) => {
                                const qty = Number(d.quantity) || 0;
                                const reorder = Number(d.reorderLevel) || 0;
                                const low = reorder > 0 && qty <= reorder;
                                const out = qty <= 0;
                                return (
                                    <TableRow key={d._id}>
                                        <TableCell className="font-medium">
                                            {d.name}{d.strength ? ` ${d.strength}` : ""}
                                            {d.prescriptionRequired && <Badge variant="outline" className="ml-2 text-xs">Rx</Badge>}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{d.form || "—"}{d.unit ? ` / ${d.unit}` : ""}</TableCell>
                                        <TableCell className="text-right">{formatMoney(Number(d.salePrice) || 0, currency)}</TableCell>
                                        <TableCell className="text-center">{qty}</TableCell>
                                        <TableCell className="text-center">
                                            {out ? (
                                                <Badge className="bg-red-100 text-red-700">Out of stock</Badge>
                                            ) : low ? (
                                                <Badge className="bg-amber-100 text-amber-700">Low stock</Badge>
                                            ) : (
                                                <Badge className="bg-green-100 text-green-700">In stock</Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
