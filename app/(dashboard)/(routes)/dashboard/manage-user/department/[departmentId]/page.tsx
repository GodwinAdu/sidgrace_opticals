
import { Separator } from "@/components/ui/separator";
import { redirect } from "next/navigation";
import { EditDepartment } from "../_components/EditDepartment";
import { currentUser } from "@/lib/helpers/current-user";
import Heading from "@/app/components/Heading";


type Params = Promise<{ departmentId: string }>
const page = async ({
  params,
}: {
  params: Params;
}) => {
  const user = await currentUser();

  if (!user) redirect("/");

  const { departmentId } = await params;

  const initialData = (await fetchDepartmentById(departmentId)) || {};

  return (
    <>
      <div className="flex justify-between items-center">
        <Heading
          title="Update Department"
          description="Edit and manage School House details"
        />

      </div>
      <Separator />
      <div className="pt-4 w-full">
        <EditDepartment initialData={initialData} />
      </div>
    </>
  );
};

export default page;
