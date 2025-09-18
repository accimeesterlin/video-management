import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Company from "@/models/Company";
import User from "@/models/User";
import dbConnect, { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { emailService } from "@/lib/email";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();
    await dbConnect();

    // Get user by email first
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all companies where the user is a member (using ObjectId)
    const companies = await Company.find({
      $or: [
        { ownerId: user._id },
        { "members.userId": user._id },
      ],
    }).populate("members.userId", "name email");

    // Extract all unique team members from all companies
    const teamMembers: Array<{
      _id: string;
      name: string;
      email: string;
      role: string;
      company: string;
      companyId: string;
      status: string;
      joinedDate: Date;
      currentProjects: number;
      completedProjects: number;
      performance: string;
      skills: string[];
    }> = [];
    const seenUsers = new Set();

    companies.forEach((company) => {
      company.members.forEach(
        (member: {
          userId: {
            _id: { toString: () => string };
            name: string;
            email: string;
          };
          role: string;
          joinedAt: Date;
          status?: string;
        }) => {
          if (!seenUsers.has(member.userId._id.toString())) {
            seenUsers.add(member.userId._id.toString());
            teamMembers.push({
              _id: member.userId._id.toString(),
              name: member.userId.name,
              email: member.userId.email,
              role: member.role,
              company: company.name,
              companyId: company._id.toString(),
              status: member.status === "PENDING" ? "Pending" : "Active",
              joinedDate: member.joinedAt,
              currentProjects: 0,
              completedProjects: 0,
              performance: "Good",
              skills: [],
            });
          }
        }
      );
    });

    return NextResponse.json(teamMembers);
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { userId, companyId } = await request.json();

    if (!userId || !companyId) {
      return NextResponse.json(
        { message: "User ID and company ID are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(companyId) || !ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Invalid ID format" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await dbConnect();

    // Get current user to verify permissions
    const currentUser = await User.findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find the company and verify the current user has permission to remove members
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if current user is owner or has permission to manage members
    const hasPermission = 
      company.ownerId.toString() === currentUser._id.toString() ||
      company.members.some((member: any) => {
        const memberUserId = member.userId instanceof ObjectId
          ? member.userId.toString()
          : member.userId?._id?.toString?.() || member.userId?.toString?.();
        return (
          memberUserId === currentUser._id.toString() &&
          (member.role === "ADMIN" || member.role === "MANAGER")
        );
      });

    if (!hasPermission) {
      return NextResponse.json(
        { message: "You don't have permission to remove team members" },
        { status: 403 }
      );
    }

    const companyObjectId = new ObjectId(companyId);
    const memberObjectId = new ObjectId(userId);

    let updateResult = await Company.updateOne(
      { _id: companyObjectId },
      {
        $pull: { members: { userId: memberObjectId } },
        $set: { updatedAt: new Date() },
      }
    );

    if (updateResult.modifiedCount === 0) {
      updateResult = await Company.updateOne(
        { _id: companyObjectId },
        {
          $pull: { members: { userId } },
          $set: { updatedAt: new Date() },
        }
      );
    }

    if (updateResult.modifiedCount === 0) {
      return NextResponse.json(
        { message: "Team member not found in company" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Team member removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing team member:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { email, name, role, companyId } = await request.json();

    if (!email || !name || !companyId) {
      return NextResponse.json(
        { message: "Email, name, and company ID are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    const safeName = trimmedName || normalizedEmail.split("@")[0];

    // Validate ObjectId format
    if (!ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { message: "Invalid company ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    await dbConnect();

    // Find the company and add the user as a member
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Get current user for email sending
    const currentUser = await User.findOne({ email: session.user.email });

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenHash = crypto
      .createHash("sha256")
      .update(inviteToken)
      .digest("hex");
    const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      const fallbackPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(fallbackPassword, 12);

      user = new User({
        name: safeName,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "MEMBER",
        needsPasswordReset: true,
        inviteToken: inviteTokenHash,
        inviteExpires,
        pendingCompanyId: company._id,
      });
      await user.save();
    } else {
      const memberRecord = company.members.find(
        (member: any) =>
          (member.userId?.toString?.() || member.userId?._id?.toString?.() || member.userId?.toString()) ===
          user._id.toString()
      );

      if (memberRecord && memberRecord.status !== "PENDING") {
        return NextResponse.json(
          { message: "User is already a member of this company" },
          { status: 400 }
        );
      }

      user.inviteToken = inviteTokenHash;
      user.inviteExpires = inviteExpires;
      user.pendingCompanyId = company._id;
      if (!user.name && safeName) {
        user.name = safeName;
      }
      await user.save();
    }

    // Upsert membership as pending
    const existingMemberIndex = company.members.findIndex(
      (member: any) =>
        (member.userId?.toString?.() || member.userId?._id?.toString?.() || member.userId?.toString()) ===
        user._id.toString()
    );

    if (existingMemberIndex === -1) {
      company.members.push({
        userId: user._id,
        role: role || "MEMBER",
        joinedAt: new Date(),
        status: "PENDING",
        invitedBy: currentUser?._id,
        inviteToken: inviteTokenHash,
        inviteExpires,
      });
    } else {
      company.members[existingMemberIndex].status = "PENDING";
      if (role) {
        company.members[existingMemberIndex].role = role;
      }
      company.members[existingMemberIndex].invitedBy = currentUser?._id;
      company.members[existingMemberIndex].inviteToken = inviteTokenHash;
      company.members[existingMemberIndex].inviteExpires = inviteExpires;
    }

    await company.save();

    const inviteBaseUrl = (() => {
      if (process.env.NEXTAUTH_URL) {
        try {
          return new URL(process.env.NEXTAUTH_URL).toString();
        } catch (error) {
          console.warn("Invalid NEXTAUTH_URL provided, falling back to request origin");
        }
      }

      const originHeader = request.headers.get("origin");
      if (originHeader) {
        return originHeader;
      }

      const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
      const forwardedHost =
        request.headers.get("x-forwarded-host") ||
        request.headers.get("host") ||
        "localhost:3000";

      return `${forwardedProto}://${forwardedHost}`;
    })();

    const inviteUrl = new URL(
      `/auth/invite?token=${inviteToken}`,
      inviteBaseUrl
    ).toString();

    // Send invitation email
    try {
      await emailService.sendProjectInvitation(
        normalizedEmail,
        `${company.name} Team`,
        currentUser?.name || "Team Admin",
        inviteUrl,
        currentUser?._id?.toString()
      );
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the entire invitation if email fails
    }

    const populatedCompany = await Company.findById(companyId).populate(
      "members.userId",
      "name email"
    );

    return NextResponse.json(
      {
        message: "Team member invited successfully",
        company: populatedCompany,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error inviting team member:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
