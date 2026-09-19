import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

export default function Loading() {
    return (
        <>
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[260px]" />
                    <Skeleton className="h-4 w-[360px]" />
                </div>
            </div>
            <Separator className="my-4" />
            <Skeleton className="h-10 w-[420px]" />
            <div className="mt-4 grid gap-6 lg:grid-cols-2">
                <Skeleton className="h-72 w-full" />
                <Skeleton className="h-72 w-full" />
            </div>
        </>
    );
}
