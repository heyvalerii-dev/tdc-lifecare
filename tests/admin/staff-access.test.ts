import { describe, expect, it } from "vitest";
import {
  parseStaffRole,
  sanitizeStaffSearch,
  staffDisplayName,
  staffRoleChangeError,
} from "@/lib/admin-staff";

describe("staff access helpers", () => {
  it("parses only the existing profile roles", () => {
    expect(parseStaffRole("admin")).toBe("admin");
    expect(parseStaffRole("client")).toBe("client");
    expect(parseStaffRole("staff")).toBeNull();
    expect(parseStaffRole("")).toBeNull();
  });

  it("prefers full name, then first/last, then email", () => {
    expect(
      staffDisplayName({
        full_name: "Valerie Joy Tolentino",
        first_name: "Valerie",
        email: "heyvalerii@gmail.com",
      })
    ).toBe("Valerie Joy Tolentino");
    expect(
      staffDisplayName({
        full_name: null,
        first_name: "Valerie",
        last_name: "Tolentino",
        email: "heyvalerii@gmail.com",
      })
    ).toBe("Valerie Tolentino");
    expect(staffDisplayName({ email: "heyvalerii@gmail.com" })).toBe(
      "heyvalerii@gmail.com"
    );
  });

  it("strips PostgREST filter characters from search input", () => {
    expect(sanitizeStaffSearch("  val,erie.(test)  ")).toBe("val erie test");
  });

  it("blocks an admin from removing their own access", () => {
    expect(
      staffRoleChangeError({
        actorId: "admin-1",
        targetId: "admin-1",
        currentRole: "admin",
        nextRole: "client",
      })
    ).toBe("You can't remove your own admin access.");
  });

  it("allows promoting a client and demoting a different admin", () => {
    expect(
      staffRoleChangeError({
        actorId: "admin-1",
        targetId: "client-2",
        currentRole: "client",
        nextRole: "admin",
      })
    ).toBeNull();
    expect(
      staffRoleChangeError({
        actorId: "admin-1",
        targetId: "admin-2",
        currentRole: "admin",
        nextRole: "client",
      })
    ).toBeNull();
  });
});
