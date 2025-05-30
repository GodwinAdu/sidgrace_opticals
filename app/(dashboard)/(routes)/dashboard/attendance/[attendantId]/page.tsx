import ConsultingPageWrapper from "../_components/consulting-page-wrapper"
import { getAttendanceById, getPreviousVisitsByPatientId } from "@/lib/actions/attendance.actions"

const page = async ({ params }: { params: Promise<{ attendantId: string }> }) => {
  const { attendantId } = await params

  // Fetch current attendance data
  const patient = await getAttendanceById(attendantId)

  // Fetch previous visits for the same patient
  const previousVisits = patient?.patientId
    ? await getPreviousVisitsByPatientId(patient.patientId._id || patient.patientId, attendantId)
    : []

  return (
    <div>
      <ConsultingPageWrapper initialAttendance={patient} previousVisits={previousVisits} />
    </div>
  )
}

export default page
