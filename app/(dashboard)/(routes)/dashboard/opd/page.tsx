import React from 'react'
import { OpdPatientManagement } from './_components/OpdForm'

const page = () => {
  return (
    <main className="min-h-screen bg-background py-6 px-4 md:px-6">
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-2"> OPD</h1>
      <p className="text-muted-foreground mb-6">Patient Visit Management System</p>
      <OpdPatientManagement />
    </div>
  </main>
  )
}

export default page