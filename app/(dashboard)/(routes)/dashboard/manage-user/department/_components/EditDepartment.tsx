"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button} from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useParams, usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateDepartment } from "@/lib/actions/department.actions";


interface EditDepartmentProps {
  _id: string;
  name: string;
  createdBy: string;
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
  createdBy: z.string().min(2, {
    message: "name must be at least 2 characters.",
  }),
});

export function EditDepartment({ initialData }: { initialData: EditDepartmentProps }) {

  const router = useRouter();
  const path = usePathname();
  const params = useParams();

  const departmentId = params.departmentId as string;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData,
  });

  const { isSubmitting } = form.formState;

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await updateDepartment(departmentId, values, path);
      router.push(`/dashboard/manager-user/department`);
      form.reset();
      toast.success("Update Successfully",{
        description: "Update house  successfully...",
      });
    } catch (error) {

      console.log("error happened while updating day", error);
      toast("Something went wrong",{
        description: "Please try again later...",
      });
    }
  }

  return (
    <div className="mx-auto max-w-xl w-[96%]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enter House Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter " {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="createdBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Enter Created by</FormLabel>
                <FormControl>
                  <Input placeholder="Enter created By" {...field} />
                </FormControl>
                <FormDescription>
                  You can change to suit your needs...
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Updating..." : "Update"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
