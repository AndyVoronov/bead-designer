import { describe, it, expect } from "vitest";
import { generateTelegramLink } from "../telegram";

describe("generateTelegramLink", () => {
  it("returns URL starting with https://t.me/VoronovAndrey?text=", () => {
    const url = generateTelegramLink("ABC123", 5);
    expect(url.startsWith("https://t.me/VoronovAndrey?text=")).toBe(true);
  });

  it("contains encodeURIComponent-encoded Russian text", () => {
    const url = generateTelegramLink("ABC123", 5);
    // The Russian greeting "Здравствуйте!" should be percent-encoded
    expect(url).toContain(encodeURIComponent("Здравствуйте!"));
  });

  it("includes the design code in the URL", () => {
    const url = generateTelegramLink("TEST-CODE-42", 3);
    expect(url).toContain(encodeURIComponent("TEST-CODE-42"));
  });

  it("includes the bead count in the URL", () => {
    const url = generateTelegramLink("ABC123", 7);
    expect(url).toContain("7");
  });

  it("handles special characters in design code", () => {
    const url = generateTelegramLink("test/code&special=value", 10);
    // Should be fully encoded — no bare /, &, or = in the text parameter
    const textParam = url.split("text=")[1];
    expect(textParam).not.toContain("/");
    expect(textParam).not.toContain("&special=value");
    expect(textParam).toContain(encodeURIComponent("test/code&special=value"));
  });

  it("handles zero bead count", () => {
    const url = generateTelegramLink("EMPTY", 0);
    expect(url).toContain("%D0%91%D1%83%D1%81%D0%B8%D0%BD%3A%200"); // "Бусин: 0" encoded
  });

  it("preserves newlines as encoded characters", () => {
    const url = generateTelegramLink("X", 1);
    // The message has \n between lines — encodeURIComponent turns \n into %0A
    const textParam = url.split("text=")[1];
    expect(textParam).toContain("%0A");
  });
});
