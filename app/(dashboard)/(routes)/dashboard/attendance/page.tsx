import React from 'react'
import AttendancePage from './_components/attendance-list'
import { getAllAttendances } from '@/lib/actions/attendance.actions'

const page = async() => {
  const attendance = await getAllAttendances()

  console.log(attendance)
  return (
    <div>
      <AttendancePage attendance={attendance} />
    </div>
  )
}

export default page