import React from 'react'
import PatientRecord from '../_components/ConsultingPage'
import { getAttendanceById } from '@/lib/actions/attendance.actions'

const page = async ({ params }: { params: Promise<{ attendantId: string }> }) => {
  const { attendantId } = await params
  const patient = await getAttendanceById(attendantId)
  console.log('Patient Data:', patient)
  return (
    <div>
      <PatientRecord attendance={patient} />
    </div>
  )
}

export default page