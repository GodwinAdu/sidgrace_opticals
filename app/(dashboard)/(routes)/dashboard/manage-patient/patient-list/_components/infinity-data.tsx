"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, Calendar, ChevronRight, Edit, Eye, FileText, Loader2, MoreHorizontal, Search, Trash } from "lucide-react"

import { deletePatient, fetchInfinityPatient } from "@/lib/actions/patient.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { calculateAge } from "@/lib/utils"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { DeleteDialog } from "@/app/components/delete-dialog"

// Define the Patient type based on your data structure
interface Patient {
    _id: string
    fullName: string
    age: number
    gender: string
    contact: string
    lastVisit: string
    status: "Active" | "Scheduled" | "Waiting" | "Follow-up" | string
}

const ITEMS_PER_PAGE = 20

const InfinityTable = () => {
    const [patients, setPatients] = useState<Patient[]>([])
    const [page, setPage] = useState(1)
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [deleteLoading, setDeleteLoading] = useState(false)
    const observerTarget = useRef<HTMLDivElement>(null)
    const tableRef = useRef<HTMLDivElement>(null)

    const router = useRouter();

    const loadPatients = async (pageNumber: number, search = searchQuery) => {
        if ((loading && pageNumber > 1) || !hasMore) return

        if (pageNumber === 1) {
            setInitialLoading(true)
        } else {
            setLoading(true)
        }
        setError(null)

        try {
            const data = await fetchInfinityPatient({
                page: pageNumber,
                limit: ITEMS_PER_PAGE,
                search,
            })

            if (data.length === 0) {
                setHasMore(false)
            } else {
                if (pageNumber === 1) {
                    setPatients(data)
                } else {
                    setPatients((prevPatients) => [...prevPatients, ...data])
                }
                setPage(pageNumber + 1)
            }
        } catch (err) {
            setError("Failed to load patient data. Please try again.")
            console.error("Error fetching patients:", err)
        } finally {
            setLoading(false)
            setInitialLoading(false)
        }
    }

    useEffect(() => {
        // Load initial data
        loadPatients(1)
    }, [])

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadPatients(page)
                }
            },
            { threshold: 0.1 },
        )

        if (observerTarget.current) {
            observer.observe(observerTarget.current)
        }

        return () => {
            if (observerTarget.current) {
                observer.unobserve(observerTarget.current)
            }
        }
    }, [page, loading, hasMore])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        setPage(1)
        setHasMore(true)
        loadPatients(1, searchQuery)
    }


    const handleDelete = async (id: string) => {
        try {
            setDeleteLoading(true)
            await deletePatient(id)
            window.location.reload()

            toast.success("Patient Deleted", {
                description: "Patient deleted successfully"
            })
        } catch (error) {
            console.log(error)
            toast.error("Something went wrong", {
                description: "Please try again later"
            })
        } finally {
            setDeleteLoading(false)
        }
    }

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case "Active":
                return "bg-emerald-50 text-emerald-700 border-emerald-200"
            case "Scheduled":
                return "bg-blue-50 text-blue-700 border-blue-200"
            case "Waiting":
                return "bg-amber-50 text-amber-700 border-amber-200"
            case "Follow-up":
                return "bg-purple-50 text-purple-700 border-purple-200"
            default:
                return "bg-gray-50 text-gray-700 border-gray-200"
        }
    }

    const getStatusDot = (status: string) => {
        switch (status) {
            case "Active":
                return "bg-emerald-500"
            case "Scheduled":
                return "bg-blue-500"
            case "Waiting":
                return "bg-amber-500"
            case "Follow-up":
                return "bg-purple-500"
            default:
                return "bg-gray-500"
        }
    }

    if (initialLoading) {
        return (
            <div className="w-full h-screen flex flex-col">
                <div className="flex justify-between items-center py-6 px-8 border-b">
                    <h1 className="text-2xl font-semibold text-gray-900">Patient Records</h1>
                    <div className="w-64 h-10 bg-gray-200 animate-pulse rounded-md"></div>
                </div>
                <div className="flex-1 overflow-hidden p-8">
                    <div className="h-12 flex items-center mb-6 bg-gray-100 rounded-md animate-pulse"></div>
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="h-16 mb-2 bg-gray-100 rounded-md animate-pulse"
                            style={{ animationDelay: `${i * 0.1}s` }}
                        ></div>
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-screen flex flex-col bg-background">
            {/* Header with search */}
            <div className="flex justify-between items-center py-6 px-8 border-b">
                <h1 className="text-2xl font-semibold">Patient Records</h1>
                <form onSubmit={handleSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        type="search"
                        placeholder="Search patients..."
                        className="w-64 pl-10 pr-4 py-2 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </form>
            </div>
            <Separator />

            {/* Main content */}
            <div className="flex-1 overflow-auto p-8" ref={tableRef}>
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-lg flex items-center justify-between">
                        <div className="flex items-center">
                            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            {error}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => loadPatients(page)}
                            className="text-red-700 border-red-300 hover:bg-red-50"
                        >
                            Retry
                        </Button>
                    </div>
                )}

                {patients.length === 0 && !loading && !error ? (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                            <Search className="h-8 w-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No patients found</h3>
                        <p className="text-gray-500">Try adjusting your search or filters</p>
                    </div>
                ) : (
                    <>
                        {/* Table header */}
                        <div className="rounded-t-lg bg-background border border-gray-200 px-6 py-3 flex items-center font-medium text-sm  sticky top-0 z-10">
                            <div className="flex-1 flex items-center gap-1">
                                <span>Patient Name</span>
                                <ArrowUpDown className="h-3 w-3 opacity-50" />
                            </div>
                            <div className="w-32 hidden md:block">ID</div>
                            <div className="w-24 hidden md:block">Age/Gender</div>
                            <div className="w-32 hidden md:block">Contact</div>
                            <div className="w-32 hidden md:block">Last Visit</div>
                            <div className="w-28">Status</div>
                            <div className="w-16 text-right">Actions</div>
                        </div>

                        {/* Table body */}
                        <div className="divide-y divide-gray-200 border-x border-b border-gray-200 rounded-b-lg overflow-hidden bg-background">
                            {patients.map((patient, index) => (
                                <div
                                    key={patient._id}
                                    className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors duration-150 ease-in-out"
                                    style={{ animationDelay: `${index * 0.05}s` }}
                                >
                                    <div className="flex-1 font-medium">
                                        <Link
                                            href={`/dashboard/manage-patient/patient-list/view/${patient._id}`}
                                            className="hover:text-blue-600 transition-colors flex items-center"
                                        >
                                            {patient.fullName}
                                            <ChevronRight className="h-4 w-4 ml-1 opacity-50" />
                                        </Link>
                                    </div>
                                    <div className="w-32 text-gray-500 text-sm hidden md:block">
                                        <span className="truncate block" title={patient._id}>
                                            {patient.patientId}...
                                        </span>
                                    </div>
                                    <div className="w-24 text-gray-500 text-sm hidden md:block">{`${calculateAge(patient.dob)} / ${patient.gender}`}</div>
                                    <div className="w-32 text-gray-500 text-sm hidden md:block">{patient.phone}</div>
                                    <div className="w-32 text-gray-500 text-sm hidden md:block">{patient.lastVisit}</div>
                                    <div className="w-28">
                                        <Badge
                                            className={`px-2.5 py-0.5 text-xs font-medium border ${getStatusBadgeClass(patient.status)} flex items-center gap-1.5`}
                                        >
                                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(patient.status)}`}></span>
                                            {patient.status}
                                        </Badge>
                                    </div>
                                    <div className="w-16 text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuLabel>Patient Actions</DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>
                                                    <Link href={`/dashboard/manage-patient/patient-list/view/${patient._id}`} className="flex items-center w-full">
                                                        <Eye className="mr-2 h-4 w-4 text-gray-500" />
                                                        View Details
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem>
                                                    <Link href={`/dashboard/manage-patient/patient-list/edit/${patient._id}`} className="flex items-center w-full">
                                                        <Edit className="mr-2 h-4 w-4 text-gray-500" />
                                                        Edit Details
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="bg-red-500 hover:bg-red-800">
                                                    <DeleteDialog
                                                        id={patient?._id as string}
                                                        onContinue={handleDelete}
                                                        isLoading={loading}
                                                    />
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {/* Loading indicator and intersection observer target */}
                <div ref={observerTarget} className="w-full py-8 flex justify-center">
                    {loading && (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm font-medium">Loading more patients...</span>
                        </div>
                    )}
                    {!hasMore && patients.length > 0 && (
                        <div className="text-sm text-gray-500 bg-gray-50 px-4 py-2 rounded-full border border-gray-200">
                            All patients loaded
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default InfinityTable
