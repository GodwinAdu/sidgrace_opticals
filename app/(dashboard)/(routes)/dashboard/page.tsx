import { AnalyticsDashboard } from '@/components/dashboard-page/analytics-dashboard'
import { fetchPatientId, updatePatient } from '@/lib/actions/patient.actions'
import { sendSMS } from '@/lib/actions/twilo.actions'
import { Metadata } from 'next'
import React, { Suspense } from 'react'

export const metadata: Metadata = {
  title: "Dashboard | Sid Grace Optical",
  description: "Dashboard for Sid Grace Optical",
}

const page = async () => {
  // await updatePatient()
  // const id = "6817eb5beb47264c75857419"
  // // const patient = await fetchPatientId()
  // const number = '+233551556650'
  // const message = "Twilio testing by JuTech Devs"

  // await sendSMS(number, message)

  // console.log(patient,"patient 2 details")
  return (
    <main className="flex-1 overflow-auto p-4 md:p-6">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Suspense fallback={<div>Loading analytics...</div>}>
          <AnalyticsDashboard />
        </Suspense>
      </div>
    </main>
  )
}

export default page