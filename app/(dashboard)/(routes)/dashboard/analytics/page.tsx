import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, Download, Filter } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-gray-500">Comprehensive data insights for your practice</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select defaultValue="thisMonth">
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="thisMonth">This Month</SelectItem>
              <SelectItem value="lastMonth">Last Month</SelectItem>
              <SelectItem value="thisQuarter">This Quarter</SelectItem>
              <SelectItem value="thisYear">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Calendar className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: "Total Patients", value: "1,284", change: "+12.5%", period: "vs. last month" },
          { title: "Appointments", value: "3,456", change: "+8.2%", period: "vs. last month" },
          { title: "Revenue", value: "$48,560", change: "+15.3%", period: "vs. last month" },
          { title: "Avg. Patient Value", value: "$325", change: "+5.7%", period: "vs. last month" },
        ].map((stat, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-500">{stat.change}</span> {stat.period}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="patients">Patients</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Key metrics for the current month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-gray-50">
                <p className="text-muted-foreground">Chart visualization will appear here</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>Notable trends and patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-4">
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-green-500 p-1 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Patient growth trending up</p>
                      <p className="text-sm text-muted-foreground">12.5% increase in new patients this month</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-amber-500 p-1 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Appointment no-shows</p>
                      <p className="text-sm text-muted-foreground">5.2% of appointments were missed this month</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-blue-500 p-1 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Revenue per patient increasing</p>
                      <p className="text-sm text-muted-foreground">Average transaction value up by 5.7%</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="rounded-full bg-red-500 p-1 mt-0.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Inventory alert</p>
                      <p className="text-sm text-muted-foreground">7 items are currently out of stock</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Appointment Distribution</CardTitle>
                <CardDescription>By day of week and time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-gray-50">
                <p className="text-muted-foreground">Heatmap visualization will appear here</p>
              </CardContent>
            </Card>
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
                <CardDescription>By service category</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center bg-gray-50">
                <p className="text-muted-foreground">Chart visualization will appear here</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="patients">
          <Card>
            <CardHeader>
              <CardTitle>Patient Analytics</CardTitle>
              <CardDescription>Detailed patient metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center bg-gray-50">
              <p className="text-muted-foreground">Patient analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appointments">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Analytics</CardTitle>
              <CardDescription>Detailed appointment metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center bg-gray-50">
              <p className="text-muted-foreground">Appointment analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>Detailed financial metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center bg-gray-50">
              <p className="text-muted-foreground">Revenue analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
              <CardDescription>Detailed inventory metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center bg-gray-50">
              <p className="text-muted-foreground">Inventory analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical">
          <Card>
            <CardHeader>
              <CardTitle>Clinical Analytics</CardTitle>
              <CardDescription>Detailed clinical metrics and trends</CardDescription>
            </CardHeader>
            <CardContent className="h-[500px] flex items-center justify-center bg-gray-50">
              <p className="text-muted-foreground">Clinical analytics will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
