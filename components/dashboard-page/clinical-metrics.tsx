"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export function CommonDiagnosesCard() {
  const diagnoses = [
    { diagnosis: "Myopia", count: 245, percentage: 28 },
    { diagnosis: "Hyperopia", count: 187, percentage: 21 },
    { diagnosis: "Astigmatism", count: 156, percentage: 18 },
    { diagnosis: "Presbyopia", count: 132, percentage: 15 },
    { diagnosis: "Cataracts", count: 98, percentage: 11 },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Common Diagnoses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {diagnoses.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span className="text-sm">{item.diagnosis}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.count}</span>
                <span className="text-xs text-gray-500">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full">
          View Full Report
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

export function PrescriptionTrendsCard() {
  const prescriptions = [
    { type: "Single Vision", count: 312, trend: "up", change: "+5.2%" },
    { type: "Bifocal", count: 145, trend: "down", change: "-2.1%" },
    { type: "Progressive", count: 203, trend: "up", change: "+8.7%" },
    { type: "Reading Only", count: 98, trend: "up", change: "+1.3%" },
    { type: "Contact Lenses", count: 176, trend: "up", change: "+12.5%" },
  ]

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Prescription Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {prescriptions.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm">{item.type}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{item.count}</span>
                <span
                  className={`text-xs ${item.trend === "up" ? "text-green-500" : "text-red-500"} flex items-center`}
                >
                  {item.trend === "up" ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full">
          View Prescription Analytics
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}

export function PatientSatisfactionCard() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Patient Satisfaction</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center h-40">
          <div className="text-5xl font-bold text-blue-600">4.8</div>
          <div className="flex items-center mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`w-5 h-5 ${star <= 4 ? "text-yellow-400" : "text-yellow-200"}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <div className="text-sm text-gray-500 mt-2">Based on 1,248 patient reviews</div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" className="w-full">
          View All Reviews
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
