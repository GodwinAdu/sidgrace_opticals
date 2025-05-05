// Mock data for contacts
export const mockContacts = [
    {
        id: "1",
        name: "John Doe",
        phone: "+1 (555) 123-4567",
        email: "john.doe@example.com",
        group: "Friends",
        avatar: "/placeholder.svg?height=40&width=40&text=JD",
    },
    {
        id: "2",
        name: "Jane Smith",
        phone: "+1 (555) 987-6543",
        email: "jane.smith@example.com",
        group: "Family",
        avatar: "/placeholder.svg?height=40&width=40&text=JS",
    },
    {
        id: "3",
        name: "Robert Johnson",
        phone: "+1 (555) 456-7890",
        email: "robert.johnson@example.com",
        group: "Work",
        avatar: "/placeholder.svg?height=40&width=40&text=RJ",
    },
    {
        id: "4",
        name: "Emily Davis",
        phone: "+1 (555) 789-0123",
        email: "emily.davis@example.com",
        group: "Friends",
        avatar: "/placeholder.svg?height=40&width=40&text=ED",
    },
    {
        id: "5",
        name: "Michael Wilson",
        phone: "+1 (555) 234-5678",
        email: "michael.wilson@example.com",
        group: "Work",
        avatar: "/placeholder.svg?height=40&width=40&text=MW",
    },
    {
        id: "6",
        name: "Sarah Brown",
        phone: "+1 (555) 876-5432",
        email: "sarah.brown@example.com",
        group: "Family",
        avatar: "/placeholder.svg?height=40&width=40&text=SB",
    },
    {
        id: "7",
        name: "David Miller",
        phone: "+1 (555) 345-6789",
        email: "david.miller@example.com",
        group: "Work",
        avatar: "/placeholder.svg?height=40&width=40&text=DM",
    },
    {
        id: "8",
        name: "Jennifer Taylor",
        phone: "+1 (555) 654-3210",
        email: "jennifer.taylor@example.com",
        group: "Friends",
        avatar: "/placeholder.svg?height=40&width=40&text=JT",
    },
]

// Mock data for message templates
export const mockTemplates = [
    {
        id: "1",
        name: "Appointment Reminder",
        content:
            "Hi {name}, this is a reminder about your appointment on {date} at {time}. Please reply YES to confirm or call us to reschedule.",
    },
    {
        id: "2",
        name: "Order Confirmation",
        content:
            "Thank you for your order, {name}! Your order #{orderNumber} has been confirmed and will be shipped within 2 business days.",
    },
    {
        id: "3",
        name: "Event Invitation",
        content:
            "You're invited! Join us for {eventName} on {date} at {location}. RSVP by replying YES or NO by {rsvpDate}.",
    },
    {
        id: "4",
        name: "Payment Reminder",
        content:
            "Hi {name}, this is a friendly reminder that your payment of ${amount} is due on {dueDate}. Please disregard if you've already paid.",
    },
    {
        id: "5",
        name: "Delivery Notification",
        content:
            "Good news! Your package has been delivered. If you have any questions about your delivery, please reply to this message.",
    },
]

// Mock data for message history
export const mockMessageHistory = [
    {
        id: "1",
        recipient: "John Doe (+1 555-123-4567)",
        content:
            "Hi John, this is a reminder about your appointment tomorrow at 2:00 PM. Please reply YES to confirm or call us to reschedule.",
        sentAt: "2023-05-04T14:30:00",
        status: "delivered",
        deliveryReport: "Delivered at 2:30 PM",
    },
    {
        id: "2",
        recipient: "Jane Smith (+1 555-987-6543)",
        content:
            "Thank you for your order, Jane! Your order #12345 has been confirmed and will be shipped within 2 business days.",
        sentAt: "2023-05-03T10:15:00",
        status: "delivered",
        deliveryReport: "Delivered at 10:16 AM",
    },
    {
        id: "3",
        recipient: "Robert Johnson (+1 555-456-7890)",
        content:
            "You're invited! Join us for the Product Launch on May 15th at the Main Conference Center. RSVP by replying YES or NO by May 10th.",
        sentAt: "2023-05-02T16:45:00",
        status: "sent",
    },
    {
        id: "4",
        recipient: "Emily Davis (+1 555-789-0123)",
        content:
            "Hi Emily, this is a friendly reminder that your payment of $150.00 is due on May 10th. Please disregard if you've already paid.",
        sentAt: "2023-05-01T09:00:00",
        status: "delivered",
        deliveryReport: "Delivered at 9:01 AM",
    },
    {
        id: "5",
        recipient: "Michael Wilson (+1 555-234-5678)",
        content:
            "Good news! Your package has been delivered. If you have any questions about your delivery, please reply to this message.",
        sentAt: "2023-04-30T13:20:00",
        status: "failed",
        deliveryReport: "Failed: Invalid number",
    },
    {
        id: "6",
        recipient: "Sarah Brown (+1 555-876-5432)",
        content: "Hi Sarah, your appointment has been confirmed for May 12th at 3:30 PM. We look forward to seeing you!",
        sentAt: "2023-04-29T11:10:00",
        status: "delivered",
        deliveryReport: "Delivered at 11:11 AM",
    },
    {
        id: "7",
        recipient: "Marketing Group (8 recipients)",
        content: "Don't miss our Spring Sale! 25% off all products until May 15th. Shop now at example.com/sale",
        sentAt: "2023-05-05T08:00:00",
        status: "scheduled",
    },
    {
        id: "8",
        recipient: "David Miller (+1 555-345-6789)",
        content: "Hi David, your order has shipped! Track your package at: example.com/track/12345",
        sentAt: "2023-04-28T15:30:00",
        status: "delivered",
        deliveryReport: "Delivered at 3:31 PM",
    },
]

// Mock data for analytics
export const mockAnalytics = {
    totalMessages: 1247,
    messageGrowth: 12.5,
    deliveryRate: 98.2,
    deliveryRateChange: 0.7,
    activeContacts: 342,
    contactGrowth: 8.3,
    avgResponseTime: 4.2,
    responseTimeChange: -5.1,
    topTemplates: [
        { name: "Appointment Reminder", preview: "Hi {name}, this is a reminder about your appointment...", useCount: 187 },
        { name: "Order Confirmation", preview: "Thank you for your order, {name}! Your order...", useCount: 156 },
        { name: "Payment Reminder", preview: "Hi {name}, this is a friendly reminder that your payment...", useCount: 98 },
        { name: "Delivery Notification", preview: "Good news! Your package has been delivered...", useCount: 76 },
        { name: "Event Invitation", preview: "You're invited! Join us for {eventName} on {date}...", useCount: 63 },
    ],
}
