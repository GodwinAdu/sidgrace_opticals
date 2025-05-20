

import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import { ArrowLeft, PlusCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CreateRoleForm from "../_component/CreateRoleForm";
import { currentUser } from "@/lib/helpers/current-user";
import Heading from "@/app/components/Heading";

const page = async ({ params }: { params: { adminId: string } }) => {

  const id = params.adminId;

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Create Role"
        />

        <Link
          href={`/admin/${id}/system-config/manage-role`}
          className={cn(buttonVariants())}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Link>
      </div>
      <Separator className="my-4" />
      <CreateRoleForm type="create" />
    </>
  );
};

export default page;
