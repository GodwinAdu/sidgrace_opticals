"use client"

import type React from "react"

import { useState, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
import {
  ArrowLeft,
  Calendar,
  Camera,
  Download,
  Edit,
  Eye,
  FileImage,
  Grid,
  ImagePlus,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Upload,
  X,
  ZoomIn,
  List,
  Star,
} from "lucide-react"

// Type definitions
interface ImageCategory {
  id: string
  name: string
  description?: string
}

interface ClinicalImage {
  id: string
  patientId: string
  filename: string
  url: string
  thumbnailUrl: string
  title: string
  description?: string
  categoryId: string
  tags: string[]
  uploadedBy: string
  uploadedAt: string
  metadata: {
    captureDate?: string
    deviceInfo?: string
    eyeSide?: "left" | "right" | "both" | null
    procedureId?: string
    visitId?: string
  }
  isFavorite: boolean
}

export default function PatientImagesPage({ params }: { params: { id: string } }) {
  const patientId = params.id
  const router = useRouter()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [selectedImage, setSelectedImage] = useState<ClinicalImage | null>(null)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")

  // Form data for uploads
  const [uploadFormData, setUploadFormData] = useState({
    title: "",
    description: "",
    categoryId: "",
    tags: "",
    captureDate: format(new Date(), "yyyy-MM-dd"),
    eyeSide: "both" as "left" | "right" | "both" | null,
    deviceInfo: "",
  })

  // Patient data - would normally be fetched from an API
  const patient = {
    id: patientId,
    name: "John Smith",
  }

  // Image categories
  const imageCategories: ImageCategory[] = [
    { id: "fundus", name: "Fundus Photography", description: "Retinal imaging" },
    { id: "anterior", name: "Anterior Segment", description: "Front of the eye" },
    { id: "topography", name: "Corneal Topography", description: "Corneal surface mapping" },
    { id: "oct", name: "OCT Scans", description: "Optical Coherence Tomography" },
    { id: "visual-field", name: "Visual Field Tests", description: "Peripheral vision assessment" },
    { id: "external", name: "External Photography", description: "External eye conditions" },
    { id: "other", name: "Other", description: "Miscellaneous images" },
  ]

  // Sample clinical images
  const [clinicalImages, setClinicalImages] = useState<ClinicalImage[]>([
    {
      id: "img-001",
      patientId,
      filename: "fundus_od_2023-04-15.jpg",
      url: "/healthy-retina.png",
      thumbnailUrl: "/healthy-retina.png",
      title: "Fundus Image - Right Eye",
      description: "Annual examination fundus image of right eye",
      categoryId: "fundus",
      tags: ["fundus", "right eye", "annual exam"],
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2023-04-15T10:45:00",
      metadata: {
        captureDate: "2023-04-15",
        deviceInfo: "Topcon TRC-NW400",
        eyeSide: "right",
        visitId: "VST-001",
      },
      isFavorite: true,
    },
    {
      id: "img-002",
      patientId,
      filename: "fundus_os_2023-04-15.jpg",
      url: "/left-eye-fundus.png",
      thumbnailUrl: "/left-eye-fundus.png",
      title: "Fundus Image - Left Eye",
      description: "Annual examination fundus image of left eye",
      categoryId: "fundus",
      tags: ["fundus", "left eye", "annual exam"],
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2023-04-15T10:48:00",
      metadata: {
        captureDate: "2023-04-15",
        deviceInfo: "Topcon TRC-NW400",
        eyeSide: "left",
        visitId: "VST-001",
      },
      isFavorite: true,
    },
    {
      id: "img-003",
      patientId,
      filename: "anterior_segment_od_2023-04-15.jpg",
      url: "/anterior-eye-anatomy.png",
      thumbnailUrl: "/anterior-eye-anatomy.png",
      title: "Anterior Segment - Right Eye",
      description: "Slit lamp examination of right eye anterior segment",
      categoryId: "anterior",
      tags: ["anterior segment", "right eye", "slit lamp"],
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2023-04-15T10:52:00",
      metadata: {
        captureDate: "2023-04-15",
        deviceInfo: "Haag-Streit BQ 900",
        eyeSide: "right",
        visitId: "VST-001",
      },
      isFavorite: false,
    },
    {
      id: "img-004",
      patientId,
      filename: "anterior_segment_os_2023-04-15.jpg",
      url: "/left-eye-anterior-segment-close-up.png",
      thumbnailUrl: "/left-eye-anterior-segment-close-up.png",
      title: "Anterior Segment - Left Eye",
      description: "Slit lamp examination of left eye anterior segment",
      categoryId: "anterior",
      tags: ["anterior segment", "left eye", "slit lamp"],
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2023-04-15T10:55:00",
      metadata: {
        captureDate: "2023-04-15",
        deviceInfo: "Haag-Streit BQ 900",
        eyeSide: "left",
        visitId: "VST-001",
      },
      isFavorite: false,
    },
    {
      id: "img-005",
      patientId,
      filename: "corneal_topography_od_2023-01-22.jpg",
      url: "/corneal-topography-visualization.png",
      thumbnailUrl: "/corneal-topography-visualization.png",
      title: "Corneal Topography - Right Eye",
      description: "Corneal topography map of right eye",
      categoryId: "topography",
      tags: ["topography", "right eye", "cornea"],
      uploadedBy: "Dr. Michael Chen",
      uploadedAt: "2023-01-22T14:30:00",
      metadata: {
        captureDate: "2023-01-22",
        deviceInfo: "Oculus Pentacam",
        eyeSide: "right",
        visitId: "VST-002",
      },
      isFavorite: false,
    },
    {
      id: "img-006",
      patientId,
      filename: "oct_macula_od_2023-04-15.jpg",
      url: "/placeholder.svg?height=800&width=800&query=OCT retina scan",
      thumbnailUrl: "/placeholder.svg?height=200&width=200&query=OCT retina scan",
      title: "OCT Macula - Right Eye",
      description: "Optical coherence tomography of right eye macula",
      categoryId: "oct",
      tags: ["OCT", "right eye", "macula"],
      uploadedBy: "Dr. Sarah Johnson",
      uploadedAt: "2023-04-15T11:05:00",
      metadata: {
        captureDate: "2023-04-15",
        deviceInfo: "Zeiss Cirrus HD-OCT",
        eyeSide: "right",
        visitId: "VST-001",
      },
      isFavorite: false,
    },
  ])

  // Filter images based on active tab, search query, and selected category
  const filteredImages = clinicalImages.filter((image) => {
    // Filter by tab
    if (activeTab !== "all" && activeTab !== "favorites") {
      if (image.categoryId !== activeTab) return false
    }

    if (activeTab === "favorites" && !image.isFavorite) return false

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesTitle = image.title.toLowerCase().includes(query)
      const matchesDescription = image.description?.toLowerCase().includes(query) || false
      const matchesTags = image.tags.some((tag) => tag.toLowerCase().includes(query))

      if (!matchesTitle && !matchesDescription && !matchesTags) return false
    }

    // Filter by category
    if (selectedCategory !== "all" && image.categoryId !== selectedCategory) return false

    return true
  })

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files)
      setUploadFiles(filesArray)

      // Auto-fill title based on first file name
      if (filesArray.length > 0) {
        const fileName = filesArray[0].name.split(".")[0].replace(/_/g, " ")
        setUploadFormData((prev) => ({
          ...prev,
          title: fileName.charAt(0).toUpperCase() + fileName.slice(1),
        }))
      }
    }
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files)
      setUploadFiles(filesArray)

      // Auto-fill title based on first file name
      if (filesArray.length > 0) {
        const fileName = filesArray[0].name.split(".")[0].replace(/_/g, " ")
        setUploadFormData((prev) => ({
          ...prev,
          title: fileName.charAt(0).toUpperCase() + fileName.slice(1),
        }))
      }
    }
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setUploadFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setUploadFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle image upload
  const handleUpload = async () => {
    if (uploadFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one image to upload.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    // Initialize progress for each file
    const initialProgress: { [key: string]: number } = {}
    uploadFiles.forEach((file) => {
      initialProgress[file.name] = 0
    })
    setUploadProgress(initialProgress)

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const newProgress = { ...prev }
        let allComplete = true

        Object.keys(newProgress).forEach((fileName) => {
          if (newProgress[fileName] < 100) {
            newProgress[fileName] += Math.floor(Math.random() * 10) + 5
            if (newProgress[fileName] > 100) newProgress[fileName] = 100
            if (newProgress[fileName] < 100) allComplete = false
          }
        })

        if (allComplete) {
          clearInterval(progressInterval)
        }

        return newProgress
      })
    }, 300)

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500))

      // Create new image objects
      const newImages = uploadFiles.map((file, index) => {
        const now = new Date()
        const imageId = `img-${Math.floor(Math.random() * 10000)}`

        return {
          id: imageId,
          patientId,
          filename: file.name,
          url: URL.createObjectURL(file),
          thumbnailUrl: URL.createObjectURL(file),
          title: index === 0 ? uploadFormData.title : `${uploadFormData.title} (${index + 1})`,
          description: uploadFormData.description,
          categoryId: uploadFormData.categoryId || "other",
          tags: uploadFormData.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag),
          uploadedBy: "Current User",
          uploadedAt: now.toISOString(),
          metadata: {
            captureDate: uploadFormData.captureDate,
            deviceInfo: uploadFormData.deviceInfo,
            eyeSide: uploadFormData.eyeSide,
          },
          isFavorite: false,
        }
      })

      // Add new images to state
      setClinicalImages((prev) => [...newImages, ...prev])

      toast({
        title: "Images uploaded successfully",
        description: `${uploadFiles.length} image${uploadFiles.length > 1 ? "s" : ""} uploaded to patient record.`,
      })

      // Reset form
      setUploadFiles([])
      setUploadFormData({
        title: "",
        description: "",
        categoryId: "",
        tags: "",
        captureDate: format(new Date(), "yyyy-MM-dd"),
        eyeSide: "both",
        deviceInfo: "",
      })
      setIsUploadDialogOpen(false)
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "There was an error uploading the images. Please try again.",
        variant: "destructive",
      })
    } finally {
      clearInterval(progressInterval)
      setIsLoading(false)
    }
  }

  // Handle image deletion
  const handleDeleteImage = (imageId: string) => {
    setClinicalImages((prev) => prev.filter((img) => img.id !== imageId))

    toast({
      title: "Image deleted",
      description: "The image has been removed from the patient record.",
    })

    if (selectedImage?.id === imageId) {
      setSelectedImage(null)
      setIsViewDialogOpen(false)
    }
  }

  // Handle toggling favorite status
  const handleToggleFavorite = (imageId: string) => {
    setClinicalImages((prev) => prev.map((img) => (img.id === imageId ? { ...img, isFavorite: !img.isFavorite } : img)))

    // Also update selected image if it's the one being toggled
    if (selectedImage?.id === imageId) {
      setSelectedImage((prev) => (prev ? { ...prev, isFavorite: !prev.isFavorite } : null))
    }
  }

  // Open file browser
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Get category name by ID
  const getCategoryName = (categoryId: string) => {
    const category = imageCategories.find((cat) => cat.id === categoryId)
    return category ? category.name : "Other"
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="flex-1 space-y-6 p-6 md:p-8">
        {/* Back button and actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <Link href={`/dashboard/patients/${patientId}`}>
              <Button variant="ghost" size="sm" className="mr-2">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Patient
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-blue-900">Clinical Images: {patient.name}</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-700 hover:bg-blue-800" size="sm">
                  <ImagePlus className="h-4 w-4 mr-1" />
                  Upload Images
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Upload Clinical Images</DialogTitle>
                  <DialogDescription>
                    Upload images to the patient's clinical record. Supported formats: JPG, PNG, DICOM.
                  </DialogDescription>
                </DialogHeader>

                {/* File upload area */}
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={triggerFileInput}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,.dcm"
                    multiple
                    onChange={handleFileSelect}
                  />
                  <Upload className="h-10 w-10 mx-auto text-gray-400 mb-2" />
                  <h3 className="text-lg font-medium mb-1">Drag & drop files here</h3>
                  <p className="text-sm text-gray-500 mb-2">or click to browse</p>
                  {uploadFiles.length > 0 && (
                    <p className="text-sm font-medium text-blue-600">{uploadFiles.length} file(s) selected</p>
                  )}
                </div>

                {/* Selected files preview */}
                {uploadFiles.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">Selected Files:</h4>
                    <div className="max-h-[150px] overflow-y-auto space-y-2">
                      {uploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                          <div className="flex items-center">
                            <FileImage className="h-4 w-4 mr-2 text-blue-600" />
                            <span className="text-sm truncate max-w-[300px]">{file.name}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-xs text-gray-500 mr-2">{(file.size / 1024).toFixed(1)} KB</span>
                            {uploadProgress[file.name] ? (
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div
                                  className="bg-blue-600 h-1.5 rounded-full"
                                  style={{ width: `${uploadProgress[file.name]}%` }}
                                ></div>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setUploadFiles((prev) => prev.filter((_, i) => i !== index))
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Image metadata form */}
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        name="title"
                        value={uploadFormData.title}
                        onChange={handleInputChange}
                        placeholder="Enter a title for the image(s)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={uploadFormData.description}
                        onChange={handleInputChange}
                        placeholder="Enter a description"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="categoryId">Category</Label>
                      <Select
                        value={uploadFormData.categoryId}
                        onValueChange={(value) => handleSelectChange("categoryId", value)}
                      >
                        <SelectTrigger id="categoryId">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {imageCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="eyeSide">Eye</Label>
                      <Select
                        value={uploadFormData.eyeSide || "both"}
                        onValueChange={(value) => handleSelectChange("eyeSide", value)}
                      >
                        <SelectTrigger id="eyeSide">
                          <SelectValue placeholder="Select eye" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="right">Right Eye (OD)</SelectItem>
                          <SelectItem value="left">Left Eye (OS)</SelectItem>
                          <SelectItem value="both">Both Eyes (OU)</SelectItem>
                          <SelectItem value="null">Not Applicable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="captureDate">Capture Date</Label>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          id="captureDate"
                          name="captureDate"
                          type="date"
                          className="pl-8"
                          value={uploadFormData.captureDate}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deviceInfo">Device/Equipment</Label>
                      <Input
                        id="deviceInfo"
                        name="deviceInfo"
                        value={uploadFormData.deviceInfo}
                        onChange={handleInputChange}
                        placeholder="e.g., Topcon TRC-NW400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Input
                      id="tags"
                      name="tags"
                      value={uploadFormData.tags}
                      onChange={handleInputChange}
                      placeholder="Enter tags separated by commas"
                    />
                    <p className="text-xs text-gray-500">Example: fundus, right eye, annual exam</p>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={isLoading || uploadFiles.length === 0}
                    className="bg-blue-700 hover:bg-blue-800"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and filter bar */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              type="search"
              placeholder="Search images by title, description, or tags..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {imageCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Grid View</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>List View</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Image gallery tabs */}
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-8 lg:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="favorites">Favorites</TabsTrigger>
            <TabsTrigger value="fundus">Fundus</TabsTrigger>
            <TabsTrigger value="anterior">Anterior</TabsTrigger>
            <TabsTrigger value="topography">Topography</TabsTrigger>
            <TabsTrigger value="oct">OCT</TabsTrigger>
            <TabsTrigger value="visual-field">Visual Field</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredImages.length === 0 ? (
              <div className="text-center py-12 border rounded-lg bg-slate-50">
                <Camera className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium mb-1">No images found</h3>
                <p className="text-sm text-gray-500 mb-4">
                  {searchQuery ? "Try adjusting your search or filters" : "Upload clinical images to get started"}
                </p>
                <Button onClick={() => setIsUploadDialogOpen(true)} className="bg-blue-700 hover:bg-blue-800">
                  <ImagePlus className="h-4 w-4 mr-1" />
                  Upload Images
                </Button>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredImages.map((image) => (
                  <Card key={image.id} className="overflow-hidden">
                    <div className="relative aspect-square">
                      <Image
                        src={image.thumbnailUrl || "/placeholder.svg"}
                        alt={image.title}
                        fill
                        className="object-cover cursor-pointer"
                        onClick={() => {
                          setSelectedImage(image)
                          setIsViewDialogOpen(true)
                        }}
                      />
                      {image.isFavorite && (
                        <div className="absolute top-2 right-2">
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Favorite</Badge>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <h3 className="text-white font-medium truncate">{image.title}</h3>
                        <p className="text-white/80 text-xs">{format(new Date(image.uploadedAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <CardFooter className="p-2 flex justify-between items-center">
                      <Badge variant="outline" className="text-xs">
                        {getCategoryName(image.categoryId)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedImage(image)
                              setIsViewDialogOpen(true)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleFavorite(image.id)}>
                            {image.isFavorite ? (
                              <>
                                <Star className="h-4 w-4 mr-2 fill-amber-400 stroke-amber-400" />
                                Remove Favorite
                              </>
                            ) : (
                              <>
                                <Star className="h-4 w-4 mr-2" />
                                Add to Favorites
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Download
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleDeleteImage(image.id)} className="text-red-600">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="grid grid-cols-12 bg-slate-50 p-3 text-sm font-medium text-slate-900">
                  <div className="col-span-1">Preview</div>
                  <div className="col-span-3">Title</div>
                  <div className="col-span-2">Category</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Eye</div>
                  <div className="col-span-2 text-right">Actions</div>
                </div>
                {filteredImages.map((image, index) => (
                  <div
                    key={image.id}
                    className={`grid grid-cols-12 p-3 text-sm items-center ${
                      index !== filteredImages.length - 1 ? "border-b" : ""
                    }`}
                  >
                    <div className="col-span-1">
                      <div className="relative w-12 h-12 rounded overflow-hidden">
                        <Image
                          src={image.thumbnailUrl || "/placeholder.svg"}
                          alt={image.title}
                          fill
                          className="object-cover cursor-pointer"
                          onClick={() => {
                            setSelectedImage(image)
                            setIsViewDialogOpen(true)
                          }}
                        />
                      </div>
                    </div>
                    <div className="col-span-3">
                      <div className="font-medium">{image.title}</div>
                      <div className="text-slate-500 text-xs truncate max-w-[200px]">
                        {image.description || "No description"}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <Badge variant="outline">{getCategoryName(image.categoryId)}</Badge>
                      {image.isFavorite && (
                        <Badge className="ml-1 bg-amber-100 text-amber-800 hover:bg-amber-100">★</Badge>
                      )}
                    </div>
                    <div className="col-span-2">{format(new Date(image.uploadedAt), "MMM d, yyyy")}</div>
                    <div className="col-span-2">
                      {image.metadata.eyeSide === "right" && "Right Eye (OD)"}
                      {image.metadata.eyeSide === "left" && "Left Eye (OS)"}
                      {image.metadata.eyeSide === "both" && "Both Eyes (OU)"}
                      {!image.metadata.eyeSide && "N/A"}
                    </div>
                    <div className="col-span-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            setSelectedImage(image)
                            setIsViewDialogOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleToggleFavorite(image.id)}
                        >
                          <Star className={`h-4 w-4 ${image.isFavorite ? "fill-amber-400 stroke-amber-400" : ""}`} />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleDeleteImage(image.id)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Image viewer dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
            {selectedImage && (
              <>
                <DialogHeader>
                  <div className="flex justify-between items-center">
                    <DialogTitle>{selectedImage.title}</DialogTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleToggleFavorite(selectedImage.id)}>
                        <Star
                          className={`h-4 w-4 ${selectedImage.isFavorite ? "fill-amber-400 stroke-amber-400" : ""}`}
                        />
                      </Button>
                      <Button variant="outline" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="text-red-600"
                        onClick={() => {
                          handleDeleteImage(selectedImage.id)
                          setIsViewDialogOpen(false)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </DialogHeader>

                <div className="relative aspect-square w-full bg-black rounded-md overflow-hidden">
                  <Image
                    src={selectedImage.url || "/placeholder.svg"}
                    alt={selectedImage.title}
                    fill
                    className="object-contain"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute bottom-4 right-4 bg-white/80 hover:bg-white"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Image Details</h3>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm text-gray-500">Category: </span>
                        <Badge variant="outline">{getCategoryName(selectedImage.categoryId)}</Badge>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Description: </span>
                        <p className="text-sm">{selectedImage.description || "No description provided"}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Tags: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedImage.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Metadata</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-x-4">
                        <div>
                          <span className="text-sm text-gray-500">Capture Date: </span>
                          <span className="text-sm">
                            {selectedImage.metadata.captureDate
                              ? format(new Date(selectedImage.metadata.captureDate), "MMM d, yyyy")
                              : "Unknown"}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Eye: </span>
                          <span className="text-sm">
                            {selectedImage.metadata.eyeSide === "right" && "Right Eye (OD)"}
                            {selectedImage.metadata.eyeSide === "left" && "Left Eye (OS)"}
                            {selectedImage.metadata.eyeSide === "both" && "Both Eyes (OU)"}
                            {!selectedImage.metadata.eyeSide && "N/A"}
                          </span>
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Device: </span>
                        <span className="text-sm">{selectedImage.metadata.deviceInfo || "Not specified"}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Uploaded by: </span>
                        <span className="text-sm">{selectedImage.uploadedBy}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">Uploaded on: </span>
                        <span className="text-sm">
                          {format(new Date(selectedImage.uploadedAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
