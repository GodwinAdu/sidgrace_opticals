import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
    return (
        <>
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[220px]" />
                    <Skeleton className="h-4 w-[320px]" />
                </div>
                <Skeleton className="h-10 w-[150px]" />
            </div>
            <Separator className="my-4" />
            <Skeleton className="h-10 w-[250px]" />
            <div className="mt-4 rounded-md border">
                {Array(6).fill(null).map((_, i) => (
                    <div key={i} className="flex items-center gap-6 border-t p-4">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-4 w-[160px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-6 w-[70px]" />
                    </div>
                ))}
            </div>
        </>
    );
}
