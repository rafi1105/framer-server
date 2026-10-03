import { describe, it, expect } from "vitest";
import { generateOtp, hashCode, signToken, verifyToken } from "../src/services/auth.js";
import {
  generateVerificationEmailHtml,
  generateNewUserTeamNotificationEmailHtml,
} from "../src/services/email.js";
import { UserRecord } from "../src/db/supabase.js";

describe("Passwordless Auth Service", () => {
  it("should generate a 6-digit OTP string", () => {
    const otp = generateOtp();
    expect(otp).toMatch(/^\d{6}$/);
    const num = parseInt(otp, 10);
    expect(num).toBeGreaterThanOrEqual(100000);
    expect(num).toBeLessThan(1000000);
  });

  it("should hash OTP code consistently with SHA-256", () => {
    const hash1 = hashCode("123456");
    const hash2 = hashCode("123456");
    const hash3 = hashCode("654321");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
    expect(hash1).toHaveLength(64); // SHA-256 hex is 64 chars
  });

  it("should sign and verify JWT authentication tokens", () => {
    const payload = { userId: "user-12345", email: "test@qubtic.tech" };
    const token = signToken(payload);
    expect(typeof token).toBe("string");

    const decoded = verifyToken(token);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
  });

  it("should generate branded HTML email for user OTP verification with Qubtic & frame-drop branding", () => {
    const html = generateVerificationEmailHtml("849201", "Rafi Kabir");
    expect(html).toContain("849201");
    expect(html).toContain("Hi Rafi Kabir,");
    expect(html).toContain("QUBTIC");
    expect(html).toContain("10 minutes");
    expect(html).toContain("qubtic.tech");
    expect(html).toContain("#164E33");
  });

  it("should generate branded HTML team notification email with full user sign-up details", () => {
    const mockUser: UserRecord = {
      id: "507f1f77-bcf8-4cd7-9943-9011abcdef12",
      email: "newcreator@gmail.com",
      name: "Rafi Kabir",
      created_at: "2026-10-01T12:00:00Z",
      updated_at: "2026-10-01T12:00:00Z",
      last_login_at: "2026-10-01T12:00:00Z",
      role: "user",
    };

    const mockMeta = {
      origin: "https://framer.com",
      framerUserId: "usr_mock_12345",
      framerSiteUrl: "https://mycoolsite.framer.app",
    };

    const html = generateNewUserTeamNotificationEmailHtml(mockUser, mockMeta);

    // Verify key fields are included
    expect(html).toContain("New Member Provisioned");
    expect(html).toContain("newcreator@gmail.com");
    expect(html).toContain("Rafi Kabir");
    expect(html).toContain("507f1f77-bcf8-4cd7-9943-9011abcdef12");
    expect(html).toContain("usr_mock_12345");
    expect(html).toContain("https://mycoolsite.framer.app");
    expect(html).toContain("Qubtic Technologies");
    expect(html).toContain("#164E33");
    expect(html).toContain("Reply to Member");
  });
});
