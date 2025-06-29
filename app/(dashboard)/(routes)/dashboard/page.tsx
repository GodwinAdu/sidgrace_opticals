import { AnalyticsDashboard } from '@/components/dashboard-page/analytics-dashboard'
import { patientAnalytics } from '@/lib/actions/analytics.actions'
import { Metadata } from 'next'
import React, { Suspense } from 'react'

export const metadata: Metadata = {
  title: "Dashboard | Sid Grace Optical",
  description: "Dashboard for Sid Grace Optical",
}

const page = async () => {
  const patientData = await patientAnalytics()



  return (
    <main className="flex-1 overflow-auto">
      <div className="flex-1 space-y-4 ">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        </div>
        <Suspense fallback={<div>Loading analytics...</div>}>
          <AnalyticsDashboard patientData={patientData} />
        </Suspense>
      </div>
    </main>
  )
}

export default page