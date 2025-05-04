"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { X, Upload, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface FileUploadProps {
    value?: File | null
    onChange: (file: File | null) => void
    onError?: (error: string) => void
    accept?: Record<string, string[]>
    maxSize?: number
    className?: string
}

export function FileUpload({
    value,
    onChange,
    onError,
    accept = {
        "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    },
    maxSize = 5 * 1024 * 1024, // 5MB
    className,
}: FileUploadProps) {
    const [preview, setPreview] = React.useState<string | null>(null)

    const onDrop = React.useCallback(
        (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return

            const file = acceptedFiles[0]
            onChange(file)

            // Create preview
            const reader = new FileReader()
            reader.onload = () => {
                setPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        },
        [onChange],
    )

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize,
        multiple: false,
        onDropRejected: (fileRejections) => {
            const error = fileRejections[0]?.errors[0]
            if (error?.code === "file-too-large") {
                onError?.(`File is too large. Max size is ${maxSize / (1024 * 1024)}MB`)
            } else if (error?.code === "file-invalid-type") {
                onError?.("File type not supported")
            } else {
                onError?.("Error uploading file")
            }
        },
    })

    const removeFile = () => {
        onChange(null)
        setPreview(null)
    }

    React.useEffect(() => {
        // Clean up preview URL when component unmounts
        return () => {
            if (preview) {
                URL.revokeObjectURL(preview)
            }
        }
    }, [preview])

    return (
        <div className={cn("space-y-2", className)}>
            {!value && !preview ? (
                <div
                    {...getRootProps()}
                    className={cn(
                        "flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-6 transition-colors",
                        isDragActive ? "border-primary/50 bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50",
                    )}
                >
                    <input {...getInputProps()} />
                    <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
                    <p className="text-sm font-medium">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground">SVG, PNG, JPG or GIF (max. {maxSize / (1024 * 1024)}MB)</p>
                </div>
            ) : (
                <div className="relative overflow-hidden rounded-lg border">
                    <div className="flex items-center gap-2 p-2">
                        {preview ? (
                            <div className="h-16 w-16 overflow-hidden rounded-md">
                                <img src={preview || "/placeholder.svg"} alt="Preview" className="h-full w-full object-cover" />
                            </div>
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                                <FileImage className="h-8 w-8 text-muted-foreground" />
                            </div>
                        )}
                        <div className="flex-1 truncate">
                            <p className="truncate text-sm font-medium">{value?.name}</p>
                            <p className="text-xs text-muted-foreground">{value ? `${(value.size / 1024).toFixed(2)} KB` : ""}</p>
                        </div>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={removeFile}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Remove file</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
