
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { fetchRoleById } from "@/lib/actions/role.actions";
import Heading from "@/app/components/Heading";

type Props = Promise<{ manageRoleId: string, }>

const page = async ({ params }: { params: Props }) => {

  const { manageRoleId } = await params;

  const initialData = await fetchRoleById(manageRoleId)


  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Role Details"
          description="Explore the role content"
        />

        <Link
          href={`/dashboard/manage-user/manage-role`}
          className={cn(buttonVariants())}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>
      <Separator />
      {/* <DisplayRole initialData={initialData} /> */}
    </>
  )
}

export default page
