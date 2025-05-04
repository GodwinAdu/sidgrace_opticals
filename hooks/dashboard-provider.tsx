"use client"

import { currentUser } from "@/lib/helpers/current-user"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

type Role = "admin" | "doctor" | "nurse" | "receptionist" | "patient"

type User = {
    id: string
    name: string
    email: string
    role: Role
    avatar?: string
    department?: string
}

type DashboardContextType = {
    user: User | null
    setUser: (user: User | null) => void
    permissions: Record<string, boolean>
}

const defaultPermissions: Record<Role, string[]> = {
    admin: ["view_all", "edit_all","delete_all", "manage_user","manage_patient", "manage_departments", "view_reports", "edit_reports"],
    doctor: [
        "view_patients",
        "edit_patients",
        "view_appointments",
        "edit_appointments",
        "view_medical_records",
        "edit_medical_records",
    ],
    nurse: ["view_patients", "edit_patients", "view_appointments", "view_medical_records", "edit_medical_records"],
    receptionist: ["view_patients", "edit_patients", "view_appointments", "edit_appointments"],
    patient: ["view_own_records", "view_own_appointments", "edit_own_profile"],
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: ReactNode }) {
    // In a real app, you would fetch the user from your auth system
    const [user, setUser] = useState<User | null>(null);

    useEffect(()=>{
        const fetchUser = async() =>{
            try {
                const user = await currentUser();
                setUser(user)
            } catch (error) {
                console.log("error while getting current user",error)
            }
        };

        fetchUser()
    },[])

    // Calculate permissions based on user role
    const permissions = user
        ? defaultPermissions[user.role].reduce(
            (acc, permission) => {
                acc[permission] = true
                return acc
            },
            {} as Record<string, boolean>,
        )
        : {}

    return <DashboardContext.Provider value={{ user, setUser, permissions }}>{children}</DashboardContext.Provider>
}

export function useDashboard() {
    const context = useContext(DashboardContext)
    if (context === undefined) {
        throw new Error("useDashboard must be used within a DashboardProvider")
    }
    return context
}

export function usePermissions() {
    const { permissions } = useDashboard()

    return {
        can: (permission: string) => !!permissions[permission],
        permissions,
    }
}
