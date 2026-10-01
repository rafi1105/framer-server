import { describe, it, expect } from "vitest";
import { generateOtp, hashCode, signToken, verifyToken } from "../src/services/auth.js";
import {
  generateVerificationEmailHtml,
  generateNewUserTeamNotificationEmailHtml,
} from "../src/services/email.js";
import { ObjectId } from "mongodb";

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

  it("should generate branded HTML email for user OTP verification with Qubtic & FrameKit branding", () => {
    const html = generateVerificationEmailHtml("849201", "Rafi Kabir");
    expect(html).toContain("849201");
    expect(html).toContain("Hi Rafi Kabir,");
    expect(html).toContain("FRAMEKIT");
    expect(html).toContain("QUBTIC TECHNOLOGIES");
    expect(html).toContain("10 minutes");
    expect(html).toContain("qubtic.tech");
  });

  it("should generate branded HTML team notification email with full user sign-up details", () => {
    const mockUser = {
      _id: new ObjectId("507f1f77bcf86cd799439011"),
      email: "newcreator@gmail.com",
      name: "Rafi Kabir",
      createdAt: new Date("2026-10-01T12:00:00Z"),
      updatedAt: new Date("2026-10-01T12:00:00Z"),
      lastLoginAt: new Date("2026-10-01T12:00:00Z"),
      role: "user",
    };

    const mockMeta = {
      ip: "103.145.74.22",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      origin: "https://framer.com",
    };

    const html = generateNewUserTeamNotificationEmailHtml(mockUser, mockMeta);

    // Verify key fields are included
    expect(html).toContain("NEW USER REGISTERED");
    expect(html).toContain("FrameKit Team Alert");
    expect(html).toContain("newcreator@gmail.com");
    expect(html).toContain("Rafi Kabir");
    expect(html).toContain("507f1f77bcf86cd799439011");
    expect(html).toContain("103.145.74.22");
    expect(html).toContain("https://framer.com");
    expect(html).toContain("Qubtic Technologies");

    // Verify Left side App Logo & Right side Company Logo layout
    expect(html).toContain("FRAMER PLUGIN APP");
    expect(html).toContain("FrameKit");
    expect(html).toContain("QUBTIC");
    expect(html).toContain("TECHNOLOGIES HQ");
    expect(html).toContain("hello@qubtic.com");
    expect(html).toContain("Reply to User");
  });
});
