
import { cn } from "@/lib/utils";
import { ArrowLeft} from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CreateRoleForm from "../_component/CreateRoleForm";
import Heading from "@/app/components/Heading";

const page = async () => {

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Create Role"
        />

        <Link
          href={`/dashboard/manage-user/manage-role`}
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
