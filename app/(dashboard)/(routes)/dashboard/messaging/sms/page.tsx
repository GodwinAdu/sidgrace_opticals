import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ComposeMessage from "./_components/compose-message"
import SMSTemplateCreator from "./_components/sms-template-creator"
import SmsHistory from "./_components/sms-history"


export const metadata: Metadata = {
  title: "SMS Platform",
  description: "Send SMS to patients and track delivery",
}

export default async function Page() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">SMS Messaging Platform</h1>
        <p className="text-muted-foreground">Send SMS to patients individually or in bulk, and track every message</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="contacts">Bulk Sms</TabsTrigger>
        </TabsList>
        <TabsContent value="compose" className="">
          <ComposeMessage />
        </TabsContent>
        <TabsContent value="history" className="">
          <SmsHistory />
        </TabsContent>
        <TabsContent value="contacts" className="">
          <SMSTemplateCreator  />
        </TabsContent>
      </Tabs>
    </div>
  )
}
