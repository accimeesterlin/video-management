import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Company from "@/models/Company";

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

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

    const user = await User.findOne({
      inviteToken: inviteTokenHash,
      inviteExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { message: "This invitation link is invalid or has expired." },
        { status: 400 }
      );
    }

    if (user.needsPasswordReset) {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { message: "Please choose a password with at least 8 characters." },
          { status: 400 }
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
      user.needsPasswordReset = false;
    } else if (password && password.length >= 8) {
      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    const companyId = user.pendingCompanyId;
    let companyName = "";

    if (companyId) {
      const company = await Company.findById(companyId);
      if (company) {
        companyName = company.name;
        const memberIndex = company.members.findIndex(
          (member: any) =>
            (member.userId?.toString?.() || member.userId?._id?.toString?.() || member.userId?.toString()) ===
            user._id.toString()
        );

        if (memberIndex === -1) {
          company.members.push({
            userId: user._id,
            role: "MEMBER",
            joinedAt: new Date(),
            status: "ACTIVE",
            inviteToken: undefined,
            inviteExpires: undefined,
          });
        } else {
          company.members[memberIndex].status = "ACTIVE";
          if (!company.members[memberIndex].joinedAt) {
            company.members[memberIndex].joinedAt = new Date();
          }
          company.members[memberIndex].inviteToken = undefined;
          company.members[memberIndex].inviteExpires = undefined;
        }

        await company.save();
        user.companyId = companyId;
      }
    }

    user.inviteToken = undefined;
    user.inviteExpires = undefined;
    user.pendingCompanyId = undefined;

    await user.save();

    return NextResponse.json({
      message: "Invitation accepted successfully",
      email: user.email,
      name: user.name,
      companyName,
      needsPasswordReset: user.needsPasswordReset,
    });
  } catch (error) {
    console.error("Invite acceptance error:", error);
    return NextResponse.json(
      { message: "Failed to accept invitation" },
      { status: 500 }
    );
  }
}
