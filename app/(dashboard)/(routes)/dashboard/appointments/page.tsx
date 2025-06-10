import React from 'react'
import AppointmentsPage from './_components/appointment'
import { fetchAppointments} from '@/lib/actions/appointment.actions'

const page = async() => {
  const appointments = await fetchAppointments()
  console.log(appointments,"")
  return (
    <>
      <AppointmentsPage appointments={appointments} />
    </>
  )
}

export default page
