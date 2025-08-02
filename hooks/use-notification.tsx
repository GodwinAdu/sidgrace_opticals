"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import type {
    IPatient,
    IContact,
    NotificationFormData,
    BulkSendProgress,
    NotificationResponse,
} from "@/types/notification.types"
import { createNotification } from "@/lib/actions/notification.actions"
import { fetchPatientBySearch } from "@/lib/actions/patient.actions"

export function useNotificationForm() {
    // Form state
    const [formData, setFormData] = useState<NotificationFormData>({
        sendMode: "individual",
        recipients: [],
        type: "SMS",
        message: "",
        isScheduled: false,
        selectedRole: [],
        allContacts: false,
        status: "published",
    })

    // UI state
    const [selectedContacts, setSelectedContacts] = useState<IContact[]>([])
    const [searchResults, setSearchResults] = useState<IPatient[]>([])
    const [searchQuery, setSearchQuery] = useState("")
    const [date, setDate] = useState<Date | undefined>(undefined)
    const [showContactSelector, setShowContactSelector] = useState(false)
    const [showScheduler, setShowScheduler] = useState(false)

    // Loading states
    const [isSearching, setIsSearching] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [bulkSendProgress, setBulkSendProgress] = useState<BulkSendProgress>({
        isActive: false,
        current: 0,
        total: 0,
        status: "",
        errors: [],
    })

    // Constants
    const MAX_SMS_LENGTH = 160
    const messageCount = Math.ceil(formData.message.length / MAX_SMS_LENGTH)
    const charactersLeft = MAX_SMS_LENGTH - (formData.message.length % MAX_SMS_LENGTH)

    // Update form data
    const updateFormData = useCallback((updates: Partial<NotificationFormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }))
    }, [])

    // Search patients
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) {
            setSearchResults([])
            return
        }

        try {
            setIsSearching(true)
            const data = await fetchPatientBySearch(searchQuery)
            setSearchResults(data)
            toast.success(`Found ${data.length} patients`)
        } catch (error) {
            console.error("Search error:", error)
            toast.error("Search failed", {
                description: "Please try again later",
            })
        } finally {
            setIsSearching(false)
            setSearchQuery("")
        }
    }, [searchQuery])

    // Toggle contact selection
    const toggleContact = useCallback((contact: IPatient) => {
        const contactAsIContact: IContact = {
            ...contact,
            name: contact.fullName,
            group: contact.role || "General",
        }

        setSelectedContacts((prev) => {
            const isSelected = prev.some((c) => c._id === contact._id)
            if (isSelected) {
                return prev.filter((c) => c._id !== contact._id)
            } else {
                return [...prev, contactAsIContact]
            }
        })
    }, [])

    // Remove contact
    const removeContact = useCallback((id: string) => {
        setSelectedContacts((prev) => prev.filter((c) => c._id !== id))
    }, [])

    // Get bulk recipients count
    const getBulkRecipientsCount = useCallback(
        (roles: string[]) => {
            if (formData.allContacts) {
                return searchResults.filter((contact) => contact.status === "active").length
            }
            if (formData.selectedRole.length > 0) {
                return searchResults.filter(
                    (contact) => formData.selectedRole.includes(contact.role || "") && contact.status === "active",
                ).length
            }
            return 0
        },
        [formData.allContacts, formData.selectedRole, searchResults],
    )

    // Simulate bulk send progress
    const simulateBulkSendProgress = useCallback(async (totalRecipients: number) => {
        setBulkSendProgress({
            isActive: true,
            current: 0,
            total: totalRecipients,
            status: "Initializing...",
            errors: [],
        })

        for (let i = 0; i < totalRecipients; i++) {
            await new Promise((resolve) => setTimeout(resolve, 300))
            setBulkSendProgress((prev) => ({
                ...prev,
                current: i + 1,
                status: `Processing recipient ${i + 1} of ${totalRecipients}...`,
            }))
        }

        setBulkSendProgress((prev) => ({
            ...prev,
            status: "Completed successfully!",
        }))

        setTimeout(() => {
            setBulkSendProgress({
                isActive: false,
                current: 0,
                total: 0,
                status: "",
                errors: [],
            })
        }, 2000)
    }, [])

    // Handle scheduling
    const handleSchedule = useCallback(() => {
        if (!date) {
            toast.error("Please select a date and time")
            return
        }

        updateFormData({
            isScheduled: true,
            scheduledDate: date,
            scheduledTime: `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`,
        })
        setShowScheduler(false)
        toast.success("Message scheduled", {
            description: `Will be sent on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`,
        })
    }, [date, updateFormData])

    // Validate form
    const validateForm = useCallback((): string[] => {
        const errors: string[] = []

        if (!formData.message.trim()) {
            errors.push("Message is required")
        }

        if (formData.message.length > 1000) {
            errors.push("Message cannot exceed 1000 characters")
        }

        if (formData.type === "EMAIL" && !formData.subject?.trim()) {
            errors.push("Subject is required for email messages")
        }

        if (formData.sendMode === "individual" && selectedContacts.length === 0) {
            errors.push("Please select at least one recipient")
        }

        if (formData.sendMode === "bulk" && !formData.allContacts && formData.selectedRole.length === 0) {
            errors.push("Please select patient categories or enable 'All Patients'")
        }

        if (formData.isScheduled && !formData.scheduledDate) {
            errors.push("Please select a scheduled date and time")
        }

        return errors
    }, [formData, selectedContacts])

    // Submit form
    const handleSubmit = useCallback(async (): Promise<NotificationResponse> => {
        const validationErrors = validateForm()
        // if (validationErrors.length > 0) {
        //     toast.error("Validation Error", {
        //         description: validationErrors.join(", "),
        //     })
        //     return {
        //         success: false,
        //         message: "Validation failed",
        //         error: validationErrors.join(", "),
        //     }
        // }

        try {
            setIsSending(true)

            // Prepare notification data
            const notificationData = {
                ...formData,
                recipients: formData.sendMode === "individual" ? selectedContacts.map((c) => c._id) : [], // For bulk mode, recipients will be resolved server-side
            }

            console.log("=== NOTIFICATION SUBMISSION ===")
            console.log("Form Data:", notificationData)
            console.log("Selected Contacts:", selectedContacts)
            console.log("=== END SUBMISSION DATA ===")

            // Create notification
            const result = await createNotification(notificationData)

            if (result.success) {
                // Show progress for bulk sends
                if (formData.sendMode === "bulk" && result.data?.recipientCount) {
                    await simulateBulkSendProgress(result.data.recipientCount)
                }

                const action = formData.isScheduled ? "scheduled" : "sent"
                const modeText = formData.sendMode === "bulk" ? "bulk message" : "message"

                toast.success(`${modeText.charAt(0).toUpperCase() + modeText.slice(1)} ${action}`, {
                    description: `Successfully ${action} to ${result.data?.recipientCount || 0} patient(s)`,
                })

                // Reset form
                resetForm()
            } else {
                toast.error("Failed to send message", {
                    description: result.error || "Please try again later",
                })
            }

            return result
        } catch (error) {
            console.error("Submit error:", error)
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
            toast.error("Failed to send message", {
                description: errorMessage,
            })
            return {
                success: false,
                message: "Failed to send message",
                error: errorMessage,
            }
        } finally {
            setIsSending(false)
        }
    }, [formData, selectedContacts, validateForm, simulateBulkSendProgress])

    // Reset form
    const resetForm = useCallback(() => {
        setFormData({
            sendMode: "individual",
            recipients: [],
            type: "SMS",
            message: "",
            isScheduled: false,
            selectedRole: [],
            allContacts: false,
            status: "published",
        })
        setSelectedContacts([])
        setSearchResults([])
        setDate(undefined)
        setShowContactSelector(false)
        setShowScheduler(false)
    }, [])

    return {
        // Form data
        formData,
        updateFormData,

        // UI state
        selectedContacts,
        searchResults,
        searchQuery,
        setSearchQuery,
        date,
        setDate,
        showContactSelector,
        setShowContactSelector,
        showScheduler,
        setShowScheduler,

        // Loading states
        isSearching,
        isSending,
        bulkSendProgress,

        // Computed values
        messageCount,
        charactersLeft,
        getBulkRecipientsCount,

        // Actions
        handleSearch,
        toggleContact,
        removeContact,
        handleSchedule,
        handleSubmit,
        resetForm,
    }
}
