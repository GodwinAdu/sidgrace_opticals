"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { CalendarIcon, UsersIcon, DollarSignIcon, PackageIcon } from "lucide-react"

// Mock data for charts
const patientData = [
  { month: "Jan", newPatients: 45, returningPatients: 65 },
  { month: "Feb", newPatients: 52, returningPatients: 70 },
  { month: "Mar", newPatients: 48, returningPatients: 75 },
  { month: "Apr", newPatients: 61, returningPatients: 80 },
  { month: "May", newPatients: 55, returningPatients: 72 },
  { month: "Jun", newPatients: 67, returningPatients: 78 },
]

const appointmentData = [
  { day: "Mon", scheduled: 24, completed: 22, cancelled: 2 },
  { day: "Tue", scheduled: 30, completed: 28, cancelled: 2 },
  { day: "Wed", scheduled: 28, completed: 25, cancelled: 3 },
  { day: "Thu", scheduled: 32, completed: 30, cancelled: 2 },
  { day: "Fri", scheduled: 35, completed: 32, cancelled: 3 },
  { day: "Sat", scheduled: 20, completed: 18, cancelled: 2 },
]

const revenueData = [
  { month: "Jan", revenue: 12500 },
  { month: "Feb", revenue: 14200 },
  { month: "Mar", revenue: 13800 },
  { month: "Apr", revenue: 15600 },
  { month: "May", revenue: 16200 },
  { month: "Jun", revenue: 17500 },
]

const inventoryData = [
  { name: "Frames", value: 35 },
  { name: "Lenses", value: 25 },
  { name: "Contact Lenses", value: 20 },
  { name: "Accessories", value: 15 },
  { name: "Solutions", value: 5 },
]

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"]

const staffPerformanceData = [
  { name: "Dr. Smith", patients: 120, revenue: 18500, satisfaction: 4.8 },
  { name: "Dr. Johnson", patients: 105, revenue: 16200, satisfaction: 4.7 },
  { name: "Dr. Williams", patients: 95, revenue: 14800, satisfaction: 4.9 },
  { name: "Dr. Brown", patients: 85, revenue: 13200, satisfaction: 4.6 },
]

const clinicalMetricsData = [
  { condition: "Myopia", count: 145 },
  { condition: "Hyperopia", count: 87 },
  { condition: "Astigmatism", count: 112 },
  { condition: "Presbyopia", count: 95 },
  { condition: "Glaucoma", count: 42 },
  { condition: "Cataracts", count: 38 },
]

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)

  // Simulate data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  // Skeleton for summary cards
  const SummaryCardSkeleton = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-5 w-[120px]" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-[80px] mb-1" />
        <Skeleton className="h-4 w-[120px]" />
      </CardContent>
    </Card>
  )

  // Skeleton for charts
  const ChartSkeleton = ({ height = "300px" }: { height?: string }) => (
    <div className={`w-full h-[${height}] flex items-center justify-center bg-muted/30 rounded-md`}>
      <div className="space-y-4 w-full p-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )

  // Skeleton for pie charts
  const PieChartSkeleton = () => (
    <div className="h-[200px] flex items-center justify-center">
      <div className="relative">
        <Skeleton className="h-32 w-32 rounded-full" />
        <Skeleton className="h-24 w-24 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  )

  // Skeleton for tables
  const TableSkeleton = () => (
    <div className="space-y-3">
      <div className="flex space-x-4 border-b pb-2">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/4" />
      </div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex space-x-4 border-b pb-2">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/4" />
        </div>
      ))}
    </div>
  )

  // Skeleton for progress bars
  const ProgressBarSkeleton = () => (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <Skeleton className="h-4 w-[120px]" />
            <Skeleton className="h-4 w-[30px]" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
            <SummaryCardSkeleton />
          </>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,248</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                <DollarSignIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$17,500</div>
                <p className="text-xs text-muted-foreground">+8.2% from last month</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Appointments</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">169</div>
                <p className="text-xs text-muted-foreground">+4.5% from last week</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
                <PackageIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">842</div>
                <p className="text-xs text-muted-foreground">+24 new items this month</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Tabs defaultValue="patients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patients">Patient Analytics</TabsTrigger>
          <TabsTrigger value="appointments">Appointment Analytics</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Analytics</TabsTrigger>
          <TabsTrigger value="staff">Staff Performance</TabsTrigger>
          <TabsTrigger value="clinical">Clinical Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="patients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Patient Growth</CardTitle>
              <CardDescription>New vs. returning patients over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patientData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="newPatients" name="New Patients" fill="#8884d8" />
                    <Bar dataKey="returningPatients" name="Returning Patients" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Patient Demographics</CardTitle>
                <CardDescription>Age distribution of patients</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <PieChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "0-18", value: 15 },
                          { name: "19-35", value: 25 },
                          { name: "36-50", value: 30 },
                          { name: "51-65", value: 20 },
                          { name: "65+", value: 10 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Referral Sources</CardTitle>
                <CardDescription>How patients are finding us</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <PieChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Doctor Referral", value: 40 },
                          { name: "Website", value: 25 },
                          { name: "Word of Mouth", value: 20 },
                          { name: "Insurance", value: 10 },
                          { name: "Other", value: 5 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointment Status</CardTitle>
              <CardDescription>Weekly appointment breakdown</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={appointmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="scheduled" name="Scheduled" fill="#8884d8" />
                    <Bar dataKey="completed" name="Completed" fill="#82ca9d" />
                    <Bar dataKey="cancelled" name="Cancelled" fill="#ff8042" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Types</CardTitle>
                <CardDescription>Distribution by service type</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <PieChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Comprehensive Exam", value: 45 },
                          { name: "Follow-up", value: 25 },
                          { name: "Contact Lens Fitting", value: 15 },
                          { name: "Emergency", value: 10 },
                          { name: "Other", value: 5 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Wait Times</CardTitle>
                <CardDescription>Average wait time by day (minutes)</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <ChartSkeleton height="200px" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        { day: "Mon", waitTime: 12 },
                        { day: "Tue", waitTime: 15 },
                        { day: "Wed", waitTime: 10 },
                        { day: "Thu", waitTime: 18 },
                        { day: "Fri", waitTime: 14 },
                        { day: "Sat", waitTime: 8 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="waitTime" stroke="#8884d8" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Revenue</CardTitle>
              <CardDescription>Revenue trend over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Service</CardTitle>
                <CardDescription>Breakdown of revenue sources</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <PieChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Eye Exams", value: 35 },
                          { name: "Eyeglasses", value: 30 },
                          { name: "Contact Lenses", value: 20 },
                          { name: "Specialty Services", value: 10 },
                          { name: "Other", value: 5 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Insurance vs. Self-Pay</CardTitle>
                <CardDescription>Payment method distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <PieChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Insurance", value: 65 },
                          { name: "Self-Pay", value: 35 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        <Cell fill="#0088FE" />
                        <Cell fill="#00C49F" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Distribution</CardTitle>
              <CardDescription>Current inventory by category</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Most popular items this month</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <ChartSkeleton height="200px" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={[
                        { name: "Ray-Ban Frames", sales: 42 },
                        { name: "Acuvue Contacts", sales: 38 },
                        { name: "Transitions Lenses", sales: 30 },
                        { name: "Oakley Frames", sales: 25 },
                        { name: "Lens Cleaner", sales: 20 },
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="sales" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alert</CardTitle>
                <CardDescription>Items that need reordering</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-5 w-[180px]" />
                        <Skeleton className="h-5 w-[50px]" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Ray-Ban RB2132</span>
                      <span className="text-red-500 font-medium">2 left</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Acuvue Oasys (6 pack)</span>
                      <span className="text-red-500 font-medium">3 left</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Anti-Reflective Coating Solution</span>
                      <span className="text-red-500 font-medium">1 left</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Oakley OO9188</span>
                      <span className="text-orange-500 font-medium">5 left</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Lens Cleaning Cloths</span>
                      <span className="text-orange-500 font-medium">8 left</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Performance</CardTitle>
              <CardDescription>Key metrics by staff member</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <TableSkeleton />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Staff Member</th>
                        <th className="text-left py-3 px-2">Patients Seen</th>
                        <th className="text-left py-3 px-2">Revenue Generated</th>
                        <th className="text-left py-3 px-2">Patient Satisfaction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffPerformanceData.map((staff, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-2">{staff.name}</td>
                          <td className="py-3 px-2">{staff.patients}</td>
                          <td className="py-3 px-2">${staff.revenue.toLocaleString()}</td>
                          <td className="py-3 px-2">{staff.satisfaction}/5.0</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Efficiency</CardTitle>
                <CardDescription>Average appointment duration by doctor (minutes)</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <ChartSkeleton height="200px" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Dr. Smith", duration: 32 },
                        { name: "Dr. Johnson", duration: 28 },
                        { name: "Dr. Williams", duration: 35 },
                        { name: "Dr. Brown", duration: 30 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="duration" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Staff Utilization</CardTitle>
                <CardDescription>Hours worked vs. capacity</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <ChartSkeleton height="200px" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Dr. Smith", worked: 38, capacity: 40 },
                        { name: "Dr. Johnson", worked: 36, capacity: 40 },
                        { name: "Dr. Williams", worked: 40, capacity: 40 },
                        { name: "Dr. Brown", worked: 32, capacity: 36 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="worked" name="Hours Worked" fill="#8884d8" />
                      <Bar dataKey="capacity" name="Capacity" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Common Diagnoses</CardTitle>
              <CardDescription>Most frequent conditions diagnosed</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {loading ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clinicalMetricsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="condition" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Prescription Types</CardTitle>
                <CardDescription>Distribution of prescription types</CardDescription>
              </CardHeader>
              <CardContent className="h-[200px]">
                {loading ? (
                  <PieChartSkeleton />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Single Vision", value: 45 },
                          { name: "Bifocal", value: 20 },
                          { name: "Progressive", value: 25 },
                          { name: "Contacts", value: 10 },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {COLORS.map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Treatment Outcomes</CardTitle>
                <CardDescription>Success rates for common treatments</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <ProgressBarSkeleton />
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Dry Eye Treatment</span>
                        <span className="text-sm font-medium">92%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "92%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Glaucoma Management</span>
                        <span className="text-sm font-medium">88%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "88%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Contact Lens Fitting</span>
                        <span className="text-sm font-medium">95%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-green-600 h-2.5 rounded-full" style={{ width: "95%" }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">Vision Therapy</span>
                        <span className="text-sm font-medium">78%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="bg-yellow-500 h-2.5 rounded-full" style={{ width: "78%" }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
