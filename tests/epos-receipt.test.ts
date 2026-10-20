import { describe, it, expect } from "vitest";
import {
    buildEposReceiptXml,
    escapeXml,
    justify,
    center,
    eposEndpoint,
    buildEposTestXml,
    type EposReceiptData,
} from "../lib/clinical/epos-receipt";

describe("escapeXml", () => {
    it("escapes XML-significant characters", () => {
        expect(escapeXml(`A & B < C > "D" 'E'`)).toBe("A &amp; B &lt; C &gt; &quot;D&quot; &apos;E&apos;");
    });
    it("coerces null/undefined to empty", () => {
        expect(escapeXml(undefined)).toBe("");
        expect(escapeXml(null)).toBe("");
    });
});

describe("justify", () => {
    it("puts label left and value right within width", () => {
        const out = justify("Total", "100.00", 20);
        expect(out.length).toBe(20);
        expect(out.startsWith("Total")).toBe(true);
        expect(out.endsWith("100.00")).toBe(true);
    });
    it("never overlaps label and value", () => {
        const out = justify("A very long label that exceeds", "9,999.99", 20);
        expect(out.length).toBeLessThanOrEqual(20);
        expect(out.endsWith("9,999.99")).toBe(true);
    });
});

describe("center", () => {
    it("left-pads to roughly center the text within the width", () => {
        const out = center("HI", 42);
        // 42-char line, "HI" is 2 chars → 20 leading spaces.
        expect(out).toBe(" ".repeat(20) + "HI");
    });
    it("does not exceed the width for long text", () => {
        const out = center("A".repeat(100), 42);
        expect(out.length).toBe(42);
    });
});

describe("eposEndpoint", () => {
    it("builds the service.cgi endpoint from a base IP url", () => {
        expect(eposEndpoint("http://192.168.1.50", "local_printer")).toBe(
            "http://192.168.1.50/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000",
        );
    });
    it("trims trailing slashes", () => {
        expect(eposEndpoint("http://192.168.1.50/", "local_printer")).toContain(
            "http://192.168.1.50/cgi-bin/epos/service.cgi",
        );
    });
    it("passes through a full service.cgi url unchanged", () => {
        const full = "http://10.0.0.9/cgi-bin/epos/service.cgi?devid=p1&timeout=10000";
        expect(eposEndpoint(full, "ignored")).toBe(full);
    });
    it("url-encodes the device id", () => {
        expect(eposEndpoint("http://x", "my printer")).toContain("devid=my%20printer");
    });
});

const DATA: EposReceiptData = {
    clinicName: "SidGrace Opticals",
    clinicAddress: "12 Vision Rd",
    clinicPhone: "0800-EYES",
    invoiceNumber: "INV-2026-00042",
    dateText: "13/10/2026 14:05",
    patientName: "Jane Doe",
    patientId: "P-1001",
    lines: [
        { name: "Eye consultation", detail: "1 x 50.00", amount: "50.00" },
        { name: "Frames & lenses", detail: "1 x 120.00", amount: "120.00" },
    ],
    totals: [
        { label: "Subtotal", value: "170.00" },
        { label: "TOTAL", value: "170.00", bold: true },
        { label: "Paid", value: "170.00" },
        { label: "Balance", value: "0.00", bold: true },
    ],
    footer: "Thank you.",
    openDrawer: true,
    width: 42,
};

describe("buildEposReceiptXml", () => {
    it("produces a well-formed ePOS SOAP envelope", () => {
        const xml = buildEposReceiptXml(DATA);
        expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
        expect(xml).toContain('<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">');
        expect(xml).toContain("</s:Envelope>");
    });

    it("includes the clinic header, invoice no, patient and totals", () => {
        const xml = buildEposReceiptXml(DATA);
        expect(xml).toContain("SidGrace Opticals");
        expect(xml).toContain("INV-2026-00042");
        expect(xml).toContain("Jane Doe");
        expect(xml).toContain("170.00");
    });

    it("emits a cut and (when requested) a drawer pulse", () => {
        const xml = buildEposReceiptXml(DATA);
        expect(xml).toContain("<cut");
        expect(xml).toContain('<pulse drawer="drawer_1"');
    });

    it("omits the drawer pulse when openDrawer is false", () => {
        const xml = buildEposReceiptXml({ ...DATA, openDrawer: false });
        expect(xml).not.toContain("<pulse");
    });

    it("escapes an ampersand in the clinic name (no raw &)", () => {
        const xml = buildEposReceiptXml({ ...DATA, clinicName: "Vision & Care" });
        expect(xml).toContain("Vision &amp; Care");
        expect(xml).not.toContain("Vision & Care");
    });
});

describe("buildEposTestXml", () => {
    it("produces a minimal well-formed test slip with a cut and no drawer", () => {
        const xml = buildEposTestXml("Vision & Care");
        expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true);
        expect(xml).toContain("PRINTER TEST");
        expect(xml).toContain("Vision &amp; Care"); // escaped
        expect(xml).toContain("<cut");
        expect(xml).not.toContain("<pulse");
    });
});
