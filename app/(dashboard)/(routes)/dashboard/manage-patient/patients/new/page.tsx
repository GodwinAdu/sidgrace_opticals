import Heading from '@/app/components/Heading'
import RegisterPatientPage from '../_components/PatientForm'
import { Separator } from '@/components/ui/separator'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

const page = () => {
  return (
    <>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 py-4">
        <div className="flex items-center">
          <Link href="/dashboard/manage-patient/patients">
            <Button variant="ghost" size="sm" className="mr-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              <span className="sr-only">Back to Patients</span>
            </Button>
          </Link>
          <Heading
            title="Register New Patient"
            description="Add a new patient to the system"
          />
        </div>
      </div>
      <Separator className='my-4' />

      <RegisterPatientPage />
    </>
  )
}

export default page