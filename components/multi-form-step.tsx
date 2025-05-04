"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface Step {
    id: string
    title: string
    description?: string
}

interface MultiStepFormProps {
    steps: Step[]
    currentStep: number
    onStepChange?: (step: number) => void
    className?: string
}

export function MultiStepForm({ steps, currentStep, onStepChange, className }: MultiStepFormProps) {
    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center justify-between">
                {steps.map((step, index) => (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center">
                            <div
                                className={cn(
                                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold",
                                    index < currentStep
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : index === currentStep
                                            ? "border-primary text-primary"
                                            : "border-muted-foreground/30 text-muted-foreground",
                                )}
                                onClick={() => {
                                    if (index < currentStep && onStepChange) {
                                        onStepChange(index)
                                    }
                                }}
                            >
                                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
                            </div>
                            <p
                                className={cn("mt-2 text-xs font-medium", {
                                    "text-primary": index <= currentStep,
                                    "text-muted-foreground": index > currentStep,
                                })}
                            >
                                {step.title}
                            </p>
                        </div>
                        {index < steps.length - 1 && (
                            <div
                                className={cn("h-[2px] flex-1", {
                                    "bg-primary": index < currentStep,
                                    "bg-muted-foreground/30": index >= currentStep,
                                })}
                            />
                        )}
                    </React.Fragment>
                ))}
            </div>
            {steps[currentStep]?.description && (
                <p className="text-center text-sm text-muted-foreground">{steps[currentStep].description}</p>
            )}
        </div>
    )
}
