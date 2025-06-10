import React from 'react'
import { OpdPatientManagement } from './_components/OpdForm'
import { Separator } from '@/components/ui/separator'
import { AttendanceDialog } from './_components/view-attendance'
import { getAllAttendances } from '@/lib/actions/attendance.actions'

const page = async() => { 
  const attendances = await getAllAttendances()
  return (
    <main className="min-h-screen bg-background py-6 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
          <div className="">
            <h1 className="text-2xl md:text-3xl font-bold mb-2"> OPD</h1>
            <p className="text-muted-foreground mb-6">Patient Visit Management System</p>
          </div>

          <AttendanceDialog data={attendances} />
        </div>
        <Separator />
        <div className="py-4">
          <OpdPatientManagement />
        </div>
      </div>
    </main>
  )
}

export default page