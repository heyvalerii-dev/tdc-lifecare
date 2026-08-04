import { describe, expect, it } from "vitest";
import {
  isPsychologistUuid,
  psychologistAdminPath,
  resolvePsychologistId,
  slugifyPsychologistName,
  uniquePsychologistSlug,
} from "@/lib/psychologist-slugs";

describe("slugifyPsychologistName", () => {
  it("builds a human-friendly slug from a full name", () => {
    expect(slugifyPsychologistName("April Anne Tolentino-Cerezo")).toBe(
      "april-anne-tolentino-cerezo"
    );
    expect(slugifyPsychologistName("Gian Carlo Tolentino")).toBe(
      "gian-carlo-tolentino"
    );
  });

  it("collapses punctuation and whitespace", () => {
    expect(slugifyPsychologistName("  Dr. Jane  Doe! ")).toBe("dr-jane-doe");
  });
});

describe("uniquePsychologistSlug", () => {
  it("returns the base slug when unused", () => {
    expect(
      uniquePsychologistSlug("April Anne", [], "a0000000-0000-0000-0000-000000000002")
    ).toBe("april-anne");
  });

  it("appends a short unique suffix when the base slug is taken", () => {
    expect(
      uniquePsychologistSlug(
        "April Anne",
        ["april-anne"],
        "a0000000-0000-0000-0000-000000000002"
      )
    ).toBe("april-anne-a000");
  });
});

describe("resolvePsychologistId", () => {
  const psychologists = [
    { id: "a0000000-0000-0000-0000-000000000001", slug: "gian-carlo-tolentino" },
    { id: "a0000000-0000-0000-0000-000000000002", slug: "april-anne-tolentino-cerezo" },
  ];

  it("resolves legacy booking aliases", () => {
    expect(resolvePsychologistId("april-anne")).toBe(
      "a0000000-0000-0000-0000-000000000002"
    );
  });

  it("resolves database slugs from the psychologist list", () => {
    expect(
      resolvePsychologistId("april-anne-tolentino-cerezo", psychologists)
    ).toBe("a0000000-0000-0000-0000-000000000002");
  });

  it("passes through UUIDs", () => {
    expect(
      resolvePsychologistId("a0000000-0000-0000-0000-000000000001")
    ).toBe("a0000000-0000-0000-0000-000000000001");
  });
});

describe("psychologistAdminPath", () => {
  it("builds admin profile and nested paths from slug", () => {
    expect(psychologistAdminPath("april-anne-tolentino-cerezo")).toBe(
      "/admin/psychologists/april-anne-tolentino-cerezo"
    );
    expect(
      psychologistAdminPath("april-anne-tolentino-cerezo", "/unavailable-blocks")
    ).toBe("/admin/psychologists/april-anne-tolentino-cerezo/unavailable-blocks");
  });

  it("detects psychologist UUIDs", () => {
    expect(isPsychologistUuid("a0000000-0000-0000-0000-000000000001")).toBe(
      true
    );
    expect(isPsychologistUuid("april-anne-tolentino-cerezo")).toBe(false);
  });
});
