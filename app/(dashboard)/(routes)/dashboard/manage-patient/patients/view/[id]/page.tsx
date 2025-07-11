
import { fetchPatientId } from "@/lib/actions/patient.actions"
import PatientDetailsView from "../_components/patient-details";


interface ViewPatientPageProps {
    params: Promise<{id:string}>
}

export default async function ViewPatientPage({ params }: ViewPatientPageProps) {
    const {id} = await params;

    const patient = await fetchPatientId(id)


    return <PatientDetailsView patient={patient} />

}
