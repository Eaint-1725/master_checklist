import { describe, it, expect } from "vitest";
import { parseWordOrDigitNumber } from "./numberParsing";

describe("parseWordOrDigitNumber", () => {
  it("prefers the digit in parentheses when both word and digit are present", () => {
    expect(parseWordOrDigitNumber("fourteen (14) days")).toBe(14);
    expect(parseWordOrDigitNumber("sixty (60) days")).toBe(60);
    expect(parseWordOrDigitNumber("five (5) years")).toBe(5);
    expect(parseWordOrDigitNumber("two (2) year periods")).toBe(2);
  });

  it("parses a bare digit when no parentheses are present", () => {
    expect(parseWordOrDigitNumber("75 days")).toBe(75);
    expect(parseWordOrDigitNumber("30 days")).toBe(30);
  });

  it("prefers the parenthesized digit even if a different digit appears earlier in the string", () => {
    expect(parseWordOrDigitNumber("Clause 4: fourteen (14) days")).toBe(14);
  });

  it("parses word-only numbers", () => {
    expect(parseWordOrDigitNumber("five years")).toBe(5);
    expect(parseWordOrDigitNumber("twenty")).toBe(20);
    expect(parseWordOrDigitNumber("fourteen days")).toBe(14);
  });

  it("parses compound word numbers with a hyphen or a space", () => {
    expect(parseWordOrDigitNumber("seventy-five days")).toBe(75);
    expect(parseWordOrDigitNumber("seventy five days")).toBe(75);
  });

  it("returns null for blank or unparseable input", () => {
    expect(parseWordOrDigitNumber(null)).toBeNull();
    expect(parseWordOrDigitNumber(undefined)).toBeNull();
    expect(parseWordOrDigitNumber("")).toBeNull();
    expect(parseWordOrDigitNumber("   ")).toBeNull();
    expect(parseWordOrDigitNumber("not stated")).toBeNull();
  });
});
