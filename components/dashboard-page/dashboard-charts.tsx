"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

// Chart color constants
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

// Patient Trends Chart
export function PatientTrendsChart() {
  const patientTrends = [
    { month: "Jan", newPatients: 45, returningPatients: 120 },
    { month: "Feb", newPatients: 52, returningPatients: 115 },
    { month: "Mar", newPatients: 49, returningPatients: 130 },
    { month: "Apr", newPatients: 63, returningPatients: 125 },
    { month: "May", newPatients: 58, returningPatients: 140 },
    { month: "Jun", newPatients: 64, returningPatients: 135 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Trends</CardTitle>
        <CardDescription>New vs. returning patients over the last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={patientTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorNewPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0088FE" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0088FE" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorReturningPatients" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00C49F" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#00C49F" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey="newPatients"
                name="New Patients"
                stroke="#0088FE"
                fillOpacity={1}
                fill="url(#colorNewPatients)"
              />
              <Area
                type="monotone"
                dataKey="returningPatients"
                name="Returning Patients"
                stroke="#00C49F"
                fillOpacity={1}
                fill="url(#colorReturningPatients)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Total Patients: 1,284</div>
        <div>Growth Rate: +12.5% YoY</div>
      </CardFooter>
    </Card>
  )
}

// Appointment Distribution Chart
export function AppointmentDistributionChart() {
  const appointmentsByType = [
    { name: "Eye Exam", value: 45 },
    { name: "Follow-up", value: 30 },
    { name: "Surgery", value: 15 },
    { name: "Consultation", value: 25 },
    { name: "Emergency", value: 10 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointment Distribution</CardTitle>
        <CardDescription>Breakdown by appointment type</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={appointmentsByType}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {appointmentsByType.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value} appointments`, "Count"]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Total Appointments: 125 this month</div>
        <div>Avg. Duration: 45 minutes</div>
      </CardFooter>
    </Card>
  )
}

// Revenue Breakdown Chart
export function RevenueBreakdownChart() {
  const revenueData = [
    { month: "Jan", consultations: 12500, eyewear: 8500, procedures: 15000 },
    { month: "Feb", consultations: 13200, eyewear: 9100, procedures: 14200 },
    { month: "Mar", consultations: 13800, eyewear: 10200, procedures: 16500 },
    { month: "Apr", consultations: 14500, eyewear: 11000, procedures: 17200 },
    { month: "May", consultations: 15200, eyewear: 12300, procedures: 18500 },
    { month: "Jun", consultations: 16000, eyewear: 13500, procedures: 19800 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue Breakdown</CardTitle>
        <CardDescription>Monthly revenue by service category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
              <Legend />
              <Bar dataKey="consultations" name="Consultations" stackId="a" fill="#8884d8" />
              <Bar dataKey="eyewear" name="Eyewear Sales" stackId="a" fill="#82ca9d" />
              <Bar dataKey="procedures" name="Procedures" stackId="a" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Total Revenue YTD: $285,450</div>
        <div>Projected Annual: $570,900</div>
        <div>Growth: +15.3% YoY</div>
      </CardFooter>
    </Card>
  )
}

// Inventory Status Chart
export function InventoryStatusChart() {
  const inventoryStatus = [
    { name: "Frames", inStock: 120, lowStock: 25, outOfStock: 5 },
    { name: "Lenses", inStock: 200, lowStock: 15, outOfStock: 0 },
    { name: "Solutions", inStock: 85, lowStock: 10, outOfStock: 2 },
    { name: "Medications", inStock: 65, lowStock: 8, outOfStock: 3 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
        <CardDescription>Current stock levels by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart layout="vertical" data={inventoryStatus} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Legend />
              <Bar dataKey="inStock" name="In Stock" stackId="a" fill="#82ca9d" />
              <Bar dataKey="lowStock" name="Low Stock" stackId="a" fill="#ffc658" />
              <Bar dataKey="outOfStock" name="Out of Stock" stackId="a" fill="#ff8042" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Total Items: 530</div>
        <div>Value: $125,450</div>
        <div>
          <span className="text-amber-500 flex items-center">10 items need reordering</span>
        </div>
      </CardFooter>
    </Card>
  )
}

// Weekly Appointment Load Chart
export function WeeklyAppointmentChart() {
  const weeklyAppointments = [
    { day: "Mon", appointments: 18 },
    { day: "Tue", appointments: 22 },
    { day: "Wed", appointments: 25 },
    { day: "Thu", appointments: 20 },
    { day: "Fri", appointments: 28 },
    { day: "Sat", appointments: 15 },
    { day: "Sun", appointments: 0 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Appointment Load</CardTitle>
        <CardDescription>Appointments scheduled per day this week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyAppointments} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="appointments"
                name="Appointments"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Total This Week: 128</div>
        <div>Avg. Per Day: 21.3</div>
        <div>Peak Day: Friday (28)</div>
      </CardFooter>
    </Card>
  )
}

// Staff Performance Chart
export function StaffPerformanceChart() {
  const staffPerformance = [
    { name: "Dr. Johnson", patients: 145, satisfaction: 4.8 },
    { name: "Dr. Smith", patients: 132, satisfaction: 4.7 },
    { name: "Dr. Williams", patients: 118, satisfaction: 4.9 },
    { name: "Dr. Brown", patients: 126, satisfaction: 4.6 },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Staff Performance</CardTitle>
        <CardDescription>Patient load and satisfaction ratings</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={staffPerformance} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="patients" name="Patients Seen" fill="#8884d8" />
              <Line yAxisId="right" type="monotone" dataKey="satisfaction" name="Satisfaction (0-5)" stroke="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-gray-500">
        <div>Total Staff: 12</div>
        <div>Avg. Satisfaction: 4.75/5</div>
        <div>Top Performer: Dr. Williams</div>
      </CardFooter>
    </Card>
  )
}
