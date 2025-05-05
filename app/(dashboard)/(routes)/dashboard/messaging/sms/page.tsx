import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ComposeMessage from "./_components/compose-message"
import ContactsManager from "./contacts-manager"
import TemplatesManager from "./templates-manager"
import MessageHistory from "./message-history"


export const metadata: Metadata = {
  title: "SMS Platform",
  description: "Advanced SMS messaging platform with modern features",
}

export default function Page() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">SMS Messaging Platform</h1>
        <p className="text-muted-foreground">Send SMS messages, manage contacts, and track message performance</p>
      </div>

      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="compose" className="mt-6">
          <ComposeMessage />
        </TabsContent>
        <TabsContent value="contacts" className="mt-6">
          <ContactsManager />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesManager />
        </TabsContent>
        <TabsContent value="history" className="mt-6">
          <MessageHistory />
        </TabsContent>
        {/* <TabsContent value="analytics" className="mt-6">
          <AnalyticsDashboard />
        </TabsContent> */}
      </Tabs>
    </div>
  )
}
