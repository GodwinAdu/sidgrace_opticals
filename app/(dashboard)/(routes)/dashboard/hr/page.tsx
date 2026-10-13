import { Separator } from "@/components/ui/separator";
import Heading from "@/app/components/Heading";
import {
    getLeaveRequests,
    getTimesheets,
    getPayrollRuns,
} from "@/lib/actions/hr.actions";
import { fetchAllStaffs } from "@/lib/actions/staff.actions";
import { HrManager } from "./_components/HrManager";

const page = async () => {
    const [staff, leaves, timesheets, payrollRuns] = await Promise.all([
        fetchAllStaffs(),
        getLeaveRequests(),
        getTimesheets(),
        getPayrollRuns(),
    ]);

    const staffOptions = (staff || []).map((s: { _id: string; fullName?: string; role?: string }) => ({
        _id: s._id,
        fullName: s.fullName || "Unnamed",
        role: s.role || "",
    }));

    return (
        <>
            <Heading
                title="HR & Payroll"
                description="Manage staff leave requests and their approval workflow, record time / attendance, and run payroll for a period — each run posts its cost to the accounting ledger."
            />
            <Separator />
            <div className="pt-4">
                <HrManager
                    staff={staffOptions}
                    leaves={leaves || []}
                    timesheets={timesheets || []}
                    payrollRuns={payrollRuns || []}
                />
            </div>
        </>
    );
};

export default page;
