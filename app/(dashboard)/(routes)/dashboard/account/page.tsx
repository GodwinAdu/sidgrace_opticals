import { redirect } from "next/navigation";

// The old mock "Billing & Payments" screen has been retired in favour of the
// real, invoice-driven billing tree. Anyone landing here is sent to the live
// invoices page.
export default function AccountBillingRedirect() {
    redirect("/dashboard/billing/invoices");
}
