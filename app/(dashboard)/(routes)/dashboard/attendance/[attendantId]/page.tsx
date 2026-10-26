import EncounterWorkspace from "../_components/encounter/EncounterWorkspace"
import { getAttendanceById, getPreviousVisitsByPatientId } from "@/lib/actions/attendance.actions"
import { getAdmissionByAttendance } from "@/lib/actions/admission.actions"
import { currentUserRole } from "@/lib/helpers/current-role"

const page = async ({ params }: { params: Promise<{ attendantId: string }> }) => {
  const { attendantId } = await params

  // Fetch current attendance data + the current user's role (for tab permissions)
  // + the active admission (inpatient header context), in parallel.
  const [patient, role, admission] = await Promise.all([
    getAttendanceById(attendantId),
    currentUserRole(),
    getAdmissionByAttendance(attendantId),
  ])

  // Fetch previous visits for the same patient
  const previousVisits = patient?.patientId
    ? await getPreviousVisitsByPatientId(patient.patientId._id || patient.patientId, attendantId)
    : []

  return (
    <div>
      <EncounterWorkspace initialAttendance={patient} previousVisits={previousVisits} role={JSON.parse(JSON.stringify(role || null))} admission={JSON.parse(JSON.stringify(admission || null))} />
    </div>
  )
}

export default page
