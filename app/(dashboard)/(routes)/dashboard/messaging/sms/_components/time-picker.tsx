"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TimePickerProps {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
}

export function TimePickerDemo({ date, setDate }: TimePickerProps) {
    const minuteRef = useRef<HTMLInputElement>(null)
    const hourRef = useRef<HTMLInputElement>(null)
    const [hour, setHour] = useState<number>(date ? date.getHours() : 12)
    const [minute, setMinute] = useState<number>(date ? date.getMinutes() : 0)
    const [dayPeriod, setDayPeriod] = useState<"AM" | "PM">(date ? (date.getHours() >= 12 ? "PM" : "AM") : "PM")

    const handleHourChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(event.target.value, 10)
        if (isNaN(value)) {
            setHour(0)
            return
        }

        if (value > 12) {
            setHour(12)
        } else if (value < 1) {
            setHour(1)
        } else {
            setHour(value)
        }

        if (value.toString().length >= 2) {
            minuteRef.current?.focus()
        }
    }

    const handleMinuteChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number.parseInt(event.target.value, 10)
        if (isNaN(value)) {
            setMinute(0)
            return
        }

        if (value > 59) {
            setMinute(59)
        } else if (value < 0) {
            setMinute(0)
        } else {
            setMinute(value)
        }
    }

    const handleDayPeriodChange = (period: "AM" | "PM") => {
        setDayPeriod(period)
    }

    const handleTimeChange = () => {
        if (!date) return

        const newDate = new Date(date)
        let hours = hour

        if (dayPeriod === "PM" && hours < 12) {
            hours += 12
        }
        if (dayPeriod === "AM" && hours === 12) {
            hours = 0
        }

        newDate.setHours(hours)
        newDate.setMinutes(minute)
        setDate(newDate)
    }

    return (
        <div className="flex items-end gap-2">
            <div className="grid gap-1 text-center">
                <Label htmlFor="hours" className="text-xs">
                    Hours
                </Label>
                <Input
                    ref={hourRef}
                    id="hours"
                    className="w-16 text-center"
                    value={hour}
                    onChange={handleHourChange}
                    onBlur={handleTimeChange}
                    type="number"
                    min={1}
                    max={12}
                />
            </div>
            <div className="grid gap-1 text-center">
                <Label htmlFor="minutes" className="text-xs">
                    Minutes
                </Label>
                <Input
                    ref={minuteRef}
                    id="minutes"
                    className="w-16 text-center"
                    value={minute.toString().padStart(2, "0")}
                    onChange={handleMinuteChange}
                    onBlur={handleTimeChange}
                    type="number"
                    min={0}
                    max={59}
                />
            </div>
            <div className="flex flex-col items-center gap-1">
                <Label className="text-xs">AM/PM</Label>
                <div className="flex gap-1">
                    <Button
                        type="button"
                        variant={dayPeriod === "AM" ? "default" : "outline"}
                        className="w-12 px-0"
                        onClick={() => {
                            handleDayPeriodChange("AM")
                            handleTimeChange()
                        }}
                    >
                        AM
                    </Button>
                    <Button
                        type="button"
                        variant={dayPeriod === "PM" ? "default" : "outline"}
                        className="w-12 px-0"
                        onClick={() => {
                            handleDayPeriodChange("PM")
                            handleTimeChange()
                        }}
                    >
                        PM
                    </Button>
                </div>
            </div>
        </div>
    )
}
