"use client"

import { useState, useCallback, useEffect } from "react"
import { toast } from "sonner"
import type {
    IPatient,
    IContact,
    NotificationFormData,
    BulkSendProgress,
    NotificationResponse,
} from "@/types/notification.types"
import { countBulkRecipients, createNotification } from "@/lib/actions/notification.actions"
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

    // Real number of patients a bulk send will reach (counted on the server)
    const [bulkCount, setBulkCount] = useState(0)
    const groupsKey = formData.selectedRole.join("|")
    useEffect(() => {
        if (formData.sendMode !== "bulk" || (!formData.allContacts && formData.selectedRole.length === 0)) {
            setBulkCount(0)
            return
        }
        let cancelled = false
        countBulkRecipients(formData.allContacts, formData.selectedRole)
            .then((n) => { if (!cancelled) setBulkCount(n) })
            .catch(() => { if (!cancelled) setBulkCount(0) })
        return () => { cancelled = true }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.sendMode, formData.allContacts, groupsKey])

    const getBulkRecipientsCount = useCallback(() => bulkCount, [bulkCount])

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
            errors.push("Please select patient groups or enable 'All patients'")
        }

        if (formData.sendMode === "bulk" && bulkCount === 0) {
            errors.push("No patients with a phone number match the selected groups")
        }

        if (formData.isScheduled && formData.scheduledDate && new Date(formData.scheduledDate) <= new Date()) {
            errors.push("The scheduled time must be in the future")
        }

        if (formData.isScheduled && !formData.scheduledDate) {
            errors.push("Please select a scheduled date and time")
        }

        return errors
    }, [formData, selectedContacts, bulkCount])

    // Submit form
    const handleSubmit = useCallback(async (): Promise<NotificationResponse> => {
        const validationErrors = validateForm()
        if (validationErrors.length > 0) {
            toast.error("Please check the message", {
                description: validationErrors.join(". "),
            })
            return {
                success: false,
                message: "Validation failed",
                error: validationErrors.join(", "),
            }
        }

        try {
            setIsSending(true)

            // Prepare notification data
            const notificationData = {
                ...formData,
                recipients: formData.sendMode === "individual" ? selectedContacts.map((c) => c._id) : [], // For bulk mode, recipients will be resolved server-side
            }

            // Create notification (the SMS service queues and sends it)
            const result = await createNotification(notificationData)

            if (result.success) {
                const count = result.data?.recipientCount || 0
                if (formData.isScheduled && formData.scheduledDate) {
                    toast.success("Message scheduled", {
                        description: `${count} patient(s) will receive it on ${new Date(formData.scheduledDate).toLocaleString()}. Track it in the History tab.`,
                    })
                } else {
                    toast.success("Message queued for sending", {
                        description: `${count} patient(s). Messages go out within a minute; check the History tab for delivery status.`,
                    })
                }

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
    }, [formData, selectedContacts, validateForm])

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
