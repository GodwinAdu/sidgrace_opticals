import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
    return (
        <>
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[250px]" />
                    <Skeleton className="h-4 w-[320px]" />
                </div>
                <Skeleton className="h-10 w-[160px]" />
            </div>
            <Separator className="my-4" />
            <div className="space-y-4">
                <Skeleton className="h-10 w-[250px]" />
                <div className="rounded-md border">
                    {Array(6).fill(null).map((_, i) => (
                        <div key={i} className="flex items-center p-4 border-t gap-6">
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-4 w-[200px]" />
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-[80px]" />
                            <Skeleton className="h-8 w-[60px]" />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
}
