import Heading from "@/app/components/Heading";
import { DataTable } from "@/components/table/data-table";
import { Separator } from "@/components/ui/separator";
import { PlusCircle } from "lucide-react";
import { columns } from "./_components/column";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { fetchAllStaffs } from "@/lib/actions/staff.actions";

const page = async () => {
  const staffs = await fetchAllStaffs()

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Manage Staffs"
        />
        <Link
          href={`staff/create`}
          className={cn(buttonVariants())}
        >
          <PlusCircle className="w-4 h-4" />
          Create Staff
        </Link>
      </div>
      <Separator />
      <DataTable
        searchKey="fullName"
        columns={columns}
        data={staffs}

      />
    </>
  )
}

export default page