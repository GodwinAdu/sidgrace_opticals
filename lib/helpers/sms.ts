/**
 * Server-side SMS helpers.
 *
 * SMS go through the SidGrace backend (c:\proj\sidgrace-backend), which talks to the
 * SMSOnlineGH gateway, keeps the SMS history (Message collection) and retries temporary
 * failures. NEXT_PUBLIC_API_URL points at it, e.g. http://127.0.0.1:5000/api/v1/
 *
 * Deliberately NOT a "use server" module: functions exported from "use server" files
 * become public server actions that any browser can call. Import these only from
 * server code (server actions / route handlers) that has already checked the user.
 */
import { connectToDB } from "../mongoose";
import ClinicSettings from "../models/clinic-settings.models";

export interface SmsSendResult {
    /** Accepted by the gateway. */
    success: boolean;
    /** Not sent yet, but queued: the backend retries automatically. */
    queued: boolean;
    message: string;
    to?: string;
    status?: string;
}

interface SendSmsOptions {
    to: string | undefined | null;
    message: string;
    recipientName?: string;
    /** Shown in SMS history, e.g. "patient-welcome", "appointment", "recall". */
    source?: string;
}

function backendBase(): string | null {
    const base = process.env.NEXT_PUBLIC_API_URL;
    if (!base) return null;
    return base.endsWith("/") ? base : `${base}/`;
}

/**
 * Sends one SMS through the backend. Never throws: SMS is a side effect and must not
 * break the action that triggered it (creating a patient, booking an appointment...).
 */
export async function sendSms({ to, message, recipientName, source }: SendSmsOptions): Promise<SmsSendResult> {
    if (!to || !String(to).trim()) return { success: false, queued: false, message: "No phone number on file" };
    const base = backendBase();
    if (!base) return { success: false, queued: false, message: "SMS backend not configured (NEXT_PUBLIC_API_URL)" };

    try {
        const res = await fetch(`${base}sms/send-sms`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ destination: String(to), message, recipientName, source }),
            cache: "no-store",
            signal: AbortSignal.timeout(20000),
        });
        const data = (await res.json().catch(() => null)) as Partial<SmsSendResult> | null;
        if (!data) return { success: false, queued: false, message: `SMS backend returned HTTP ${res.status}` };
        return {
            success: !!data.success,
            queued: !!data.queued,
            message: data.message || (data.success ? "SMS sent" : `SMS failed (HTTP ${res.status})`),
            to: data.to,
            status: data.status,
        };
    } catch (error) {
        console.error("SMS backend unreachable:", error);
        return { success: false, queued: false, message: "SMS service is not running on this computer" };
    }
}

/**
 * Asks the backend to process the queue now instead of waiting for its next minute tick.
 * Fire-and-forget: the backend answers immediately and works in the background.
 */
export async function kickSmsQueue(): Promise<void> {
    const base = backendBase();
    if (!base) return;
    try {
        await fetch(`${base}sms/queue/run`, { method: "POST", cache: "no-store", signal: AbortSignal.timeout(3000) });
    } catch {
        // The minute job picks the work up anyway.
    }
}

export interface SmsGatewayStatus {
    reachable: boolean;
    configured: boolean;
    senderId: string | null;
    balance: number | null;
    balanceModel: string | null;
    message: string;
}

/** Backend + gateway health and remaining credit, for the SMS page. */
export async function getSmsGatewayStatus(): Promise<SmsGatewayStatus> {
    const base = backendBase();
    if (!base) return { reachable: false, configured: false, senderId: null, balance: null, balanceModel: null, message: "NEXT_PUBLIC_API_URL is not set" };
    try {
        const res = await fetch(`${base}sms/balance`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
        const data = await res.json();
        return {
            reachable: true,
            configured: !!data.configured,
            senderId: data.senderId ?? null,
            balance: typeof data.data?.balance === "number" ? data.data.balance : null,
            balanceModel: data.data?.model ?? null,
            message: data.message || (data.success ? "OK" : "Gateway error"),
        };
    } catch {
        return { reachable: false, configured: false, senderId: null, balance: null, balanceModel: null, message: "SMS service is not running on this computer" };
    }
}

/**
 * Clinic name used to sign SMS. Comes from Settings > Clinic (ClinicSettings.clinicName),
 * then CLINIC_NAME in .env.local, then a neutral fallback.
 */
export async function getClinicName(): Promise<string> {
    try {
        await connectToDB();
        const settings = await ClinicSettings.findOne({ key: "clinic" }).select("clinicName").lean<{ clinicName?: string }>();
        const name = settings?.clinicName?.trim();
        if (name) return name;
    } catch (error) {
        console.error("Could not read clinic name for SMS:", error);
    }
    return process.env.CLINIC_NAME?.trim() || "our clinic";
}
