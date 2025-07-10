import React from 'react'
import CreateUser from '../_components/staff-create-form'
import { getAllDepartments } from '@/lib/actions/department.actions'
import { getAllRoles } from '@/lib/actions/role.actions'

const page = async () => {

  const [departments, roles] = await Promise.all([
    getAllDepartments(),
    getAllRoles()
  ])
  return (
    <>
      <CreateUser type='create' departments={departments} roles={roles} />
    </>
  )
}

export default page
