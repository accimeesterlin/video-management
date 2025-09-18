import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { message: "Invitation token is required" },
        { status: 400 }
      );
    }

    const inviteTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    await dbConnect();

    let user = await User.findOne({
      inviteToken: inviteTokenHash,
      inviteExpires: { $gt: new Date() },
    }).populate("pendingCompanyId", "name");

    let companyName = user?.pendingCompanyId?.name || "";

    if (!user) {
      const company = await Company.findOne({
        "members.inviteToken": inviteTokenHash,
        "members.inviteExpires": { $gt: new Date() },
      }).populate("members.userId", "email name needsPasswordReset pendingCompanyId");

      if (company) {
        const member = company.members.find(
          (entry: any) => entry.inviteToken === inviteTokenHash
        );

        if (member?.userId) {
          user = await User.findById(member.userId._id);
          companyName = company.name;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { message: "This invitation link is invalid or has expired." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      email: user.email,
      name: user.name || "",
      needsPasswordReset: !!user.needsPasswordReset,
      companyName,
    });
  } catch (error) {
    console.error("Invite verification error:", error);
    return NextResponse.json(
      { message: "Failed to verify invitation" },
      { status: 500 }
    );
  }
}
