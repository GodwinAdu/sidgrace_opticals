
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fetchRoleById } from "@/lib/actions/role.actions";
import Heading from "@/components/commons/Header";
import CreateRoleForm from "../../_component/CreateRoleForm";
import { currentUser } from "@/lib/helpers/current-user";


const page = async ({ params }: { params: { branchId: string, storeId: string, manageRoleId: string } }) => {

  const user = await currentUser();

  if (!user) {
    redirect("/")
  }
  const id = params.manageRoleId as string;
  const storeId = params.storeId as string;
  const branchId = params.branchId as string;

  console.log(id)

  const initialData = await fetchRoleById(id)


  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Update Role"
          description="manage role and update it"
        />

        <Link
          href={`/${storeId}/dashboard/${branchId}/users/manage-role`}
          className={cn(buttonVariants())}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>
      <Separator />
      <CreateRoleForm type="update" initialData={initialData} />
    </>
  )
}

export default page
