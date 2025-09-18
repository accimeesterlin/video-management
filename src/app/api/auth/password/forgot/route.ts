import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { emailService } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    await dbConnect();

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      user.passwordResetToken = resetTokenHash;
      user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour
      await user.save();

      const originHeader = request.headers.get("origin");
      const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
      const forwardedHost =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "localhost:3000";

      const baseUrl = originHeader || `${forwardedProto}://${forwardedHost}`;
      const resetUrl = new URL(`/auth/reset?token=${resetToken}`, baseUrl).toString();

      try {
        await emailService.sendPasswordResetEmail(
          normalizedEmail,
          user.name || normalizedEmail,
          resetUrl
        );
      } catch (emailError) {
        console.error("Password reset email error:", emailError);
      }
    }

    return NextResponse.json({
      message: "If we found an account for that email, we'll send password reset instructions shortly.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { message: "Unable to process password reset request" },
      { status: 500 }
    );
  }
}
