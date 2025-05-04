import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Save } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-gray-500">Manage your account settings and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="clinic">Clinic</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>
        
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <Avatar className="w-20 h-20">
                  <AvatarImage src="/female-doctor.png" alt="Dr. Sarah Johnson" />
                  <AvatarFallback>SJ</AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">Dr. Sarah Johnson</h3>
                    <Badge>Ophthalmologist</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Medical License: NY12345678</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">Change Photo</Button>
                    <Button size="sm" variant="outline" className="text-red-500">Remove</Button>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" defaultValue="Sarah" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" defaultValue="Johnson" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="sarah.johnson@sidgrace.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" defaultValue="(212) 555-1234" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="specialization">Specialization</Label>
                  <Select defaultValue="ophthalmology">
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ophthalmology">Ophthalmology</SelectItem>
                      <SelectItem value="optometry">Optometry</SelectItem>
                      <SelectItem value="cornea">Cornea Specialist</SelectItem>
                      <SelectItem value="retina">Retina Specialist</SelectItem>
                      <SelectItem value="pediatric">Pediatric Ophthalmology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea 
                    id="bio" 
                    rows={4} 
                    defaultValue="Board-certified ophthalmologist with over 10 years of experience specializing in comprehensive eye care, cataract surgery, and refractive procedures."
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Professional Information</CardTitle>
              <CardDescription>Update your credentials and qualifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input id="licenseNumber" defaultValue="NY12345678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseExpiry">License Expiry</Label>
                  <Input id="licenseExpiry" type="date" defaultValue="2025-06-30" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npiNumber">NPI Number</Label>
                  <Input id="npiNumber" defaultValue="1234567890" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deaNumber">DEA Number</Label>
                  <Input id="deaNumber" defaultValue="AB1234567" />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Board Certifications</Label>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">American Board of Ophthalmology</Badge>
                  <Badge variant="secondary">American Academy of Ophthalmology</Badge>
                  <Button size="sm" variant="outline" className="h-6">+ Add</Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Education & Training</Label>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <div>
                      <p className="font-medium">MD, Columbia University</p>
                      <p className="text-sm text-muted-foreground">2005 - 2009</p>
                    </div>
                    <Button size="sm" variant="ghost">Edit</Button>
                  </div>
                  <div className="flex justify-between items-center p-2 border rounded-md">
                    <div>
                      <p className="font-medium">Residency, Johns Hopkins Hospital</p>
                      <p className="text-sm text-muted-foreground">2009 - 2013</p>
                    </div>
                    <Button size="sm" variant="ghost">Edit</Button>
                  </div>
                  <Button size="sm" variant="outline">+ Add Education</Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Manage your account preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" defaultValue="dr.sarahjohnson" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" defaultValue="sarah.johnson@sidgrace.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select defaultValue="en">
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select defaultValue="america_new_york">
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america_new_york">America/New York (EST)</SelectItem>
                    <SelectItem value="america_chicago">America/Chicago (CST)</SelectItem>
                    <SelectItem value="america_denver">America/Denver (MST)</SelectItem>
                    <SelectItem value="america_los_angeles">America/Los Angeles (PST)</SelectItem>
                    <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive">Delete Account</Button>
              <Button>Save Changes</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="clinic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Clinic Information</CardTitle>
              <CardDescription>Manage your clinic details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clinicName">Clinic Name</Label>
                <Input id="clinicName" defaultValue="Sid Grace Opticals" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clinicAddress">Address</Label>
                <Textarea id="clinicAddress" defaultValue="123 Eye Care Lane, Suite 200, New York, NY 10001" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="clinicPhone">Phone</Label>
                  <Input id="clinicPhone" defaultValue="(212) 555-5678" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicEmail">Email</Label>
                  <Input id="clinicEmail" type="email" defaultValue="info@sidgrace.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clinicWebsite">Website</Label>
                  <Input id="clinicWebsite" type="url" defaultValue="https://www.sidgrace.com" />
                </div>\
