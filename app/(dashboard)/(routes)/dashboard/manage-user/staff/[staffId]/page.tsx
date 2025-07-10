import React from 'react'
import CreateUser from '../_components/staff-create-form'
import { getAllDepartments } from '@/lib/actions/department.actions'
import { getAllRoles } from '@/lib/actions/role.actions'
import { fetchStaffById } from '@/lib/actions/staff.actions'

const page = async ({ params }: { params: Promise<{ staffId: string }> }) => {
    const { staffId } = await params;

    const [departments, roles, staff] = await Promise.all([
        getAllDepartments(),
        getAllRoles(),
        fetchStaffById(staffId)
    ])
    return (
        <>
            <CreateUser type='update' departments={departments} roles={roles} initialData={staff} />
        </>
    )
}

export default page
