/**
 * POST /api/print-receipt
 *
 * Driverless thermal receipt printing. Accepts receipt data as JSON, builds the
 * ESC/POS byte stream, and writes it to the networked Xprinter at
 * PRINTER_IP:PRINTER_PORT (default 192.168.1.158:9100). No Windows spooler,
 * driver, or print dialog involved.
 *
 * Runs on the Node.js runtime (needs raw TCP sockets).
 */
import { NextRequest, NextResponse } from "next/server";
import { buildReceiptBytes, sendToPrinter, type EscPosReceiptData } from "@/lib/clinical/escpos-receipt";

export const runtime = "nodejs";

// Printer network location — override via env on the host. Default is the
// address the clinic's XP-E200L currently holds on the LAN.
const PRINTER_IP = process.env.PRINTER_IP || "192.168.1.158";
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);

export async function POST(req: NextRequest) {
    let data: EscPosReceiptData;
    try {
        data = (await req.json()) as EscPosReceiptData;
    } catch {
        return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    if (!data || !data.clinicName || !Array.isArray(data.lines)) {
        return NextResponse.json(
            { ok: false, error: "Missing required receipt fields (clinicName, lines)" },
            { status: 400 },
        );
    }

    try {
        const bytes = buildReceiptBytes(data);
        const result = await sendToPrinter(PRINTER_IP, PRINTER_PORT, bytes);
        if (!result.ok) {
            return NextResponse.json(
                { ok: false, error: result.error || "Printer unreachable", printer: `${PRINTER_IP}:${PRINTER_PORT}` },
                { status: 502 },
            );
        }
        return NextResponse.json({ ok: true, bytes: result.bytes, printer: `${PRINTER_IP}:${PRINTER_PORT}` });
    } catch (e) {
        return NextResponse.json(
            { ok: false, error: e instanceof Error ? e.message : "Print failed" },
            { status: 500 },
        );
    }
}
