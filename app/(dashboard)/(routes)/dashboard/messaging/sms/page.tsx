import type { Metadata } from "next"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ComposeMessage from "./_components/compose-message"
import SMSTemplateCreator from "./_components/sms-template-creator"
import { getAllRoles } from "@/lib/actions/role.actions"


export const metadata: Metadata = {
  title: "SMS Platform",
  description: "Advanced SMS messaging platform with modern features",
}

export default async function Page() {
  const roles = await getAllRoles()
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">SMS Messaging Platform</h1>
        <p className="text-muted-foreground">Send SMS messages, manage contacts, and track message performance</p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="contacts">Bulk Sms</TabsTrigger>
        </TabsList>
        <TabsContent value="compose" className="">
          <ComposeMessage roles={roles} />
        </TabsContent>
        <TabsContent value="contacts" className="">
          <SMSTemplateCreator  />
        </TabsContent>
      </Tabs>
    </div>
  )
}
