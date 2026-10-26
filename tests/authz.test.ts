import { describe, it, expect } from "vitest";
import { hasPermission, isAdmin } from "../lib/helpers/authz";

// Minimal role factory for the predicate tests.
const role = (over: Partial<IRole> = {}): IRole => ({ name: "staff", displayName: "Staff", ...over } as IRole);

describe("isAdmin", () => {
    it("recognizes admin role names", () => {
        expect(isAdmin(role({ name: "admin" }))).toBe(true);
        expect(isAdmin(role({ name: "Admin" }))).toBe(true);
        expect(isAdmin(role({ name: "superadmin" }))).toBe(true);
    });
    it("is false for non-admin and null", () => {
        expect(isAdmin(role({ name: "nurse" }))).toBe(false);
        expect(isAdmin(null)).toBe(false);
    });
});

describe("hasPermission", () => {
    it("allows when the flag is set", () => {
        expect(hasPermission(role({ billingManagement: true }), "billingManagement")).toBe(true);
    });
    it("denies when the flag is missing/false", () => {
        expect(hasPermission(role({ billingManagement: false }), "billingManagement")).toBe(false);
        expect(hasPermission(role({}), "billingManagement")).toBe(false);
    });
    it("admin bypasses any flag", () => {
        expect(hasPermission(role({ name: "admin" }), "billingManagement")).toBe(true);
    });
    it("requires ALL flags when given a list", () => {
        expect(hasPermission(role({ billingManagement: true, insuranceManagement: true }), ["billingManagement", "insuranceManagement"])).toBe(true);
        expect(hasPermission(role({ billingManagement: true }), ["billingManagement", "insuranceManagement"])).toBe(false);
    });
    it("denies null role", () => {
        expect(hasPermission(null, "billingManagement")).toBe(false);
    });
});
