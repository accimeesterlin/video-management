import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
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

    const { db } = await connectToDatabase();

    // Get user by email first
    const user = await db.collection("users").findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all companies where the user is a member
    const companies = await db.collection("companies").find({
      $or: [
        { ownerId: user._id },
        { "members.userId": user._id },
      ],
    }).toArray();

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
    const userIds = new Set();

    // Collect all user IDs from members
    companies.forEach((company) => {
      if (company.members) {
        company.members.forEach((member: any) => {
          if (member.userId) {
            userIds.add(member.userId.toString());
          }
        });
      }
    });

    // Fetch all users at once
    const users = await db.collection("users").find({
      _id: { $in: Array.from(userIds).map(id => new ObjectId(id as string)) }
    }).toArray();

    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user._id.toString(), user);
    });

    companies.forEach((company) => {
      if (company.members) {
        company.members.forEach((member: any) => {
          const memberUser = userMap.get(member.userId.toString());
          if (memberUser && !seenUsers.has(member.userId.toString())) {
            seenUsers.add(member.userId.toString());
            teamMembers.push({
              _id: member.userId.toString(),
              name: memberUser.name,
              email: memberUser.email,
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
        });
      }
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

    const { db } = await connectToDatabase();

    // Get current user to verify permissions
    const currentUser = await db.collection("users").findOne({ email: session.user.email });
    if (!currentUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find the company and verify the current user has permission to remove members
    const company = await db.collection("companies").findOne({ _id: new ObjectId(companyId) });
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if current user is owner or has permission to manage members
    const hasPermission = 
      company.ownerId.toString() === currentUser._id.toString() ||
      (company.members || []).some((member: any) => {
        const memberUserId = member.userId.toString();
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

    const memberObjectId = new ObjectId(userId);

    const updateResult = await db.collection("companies").updateOne(
      { _id: new ObjectId(companyId) },
      {
        $pull: { members: { userId: memberObjectId } },
        $set: { updatedAt: new Date() },
      }
    );

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

    const { db } = await connectToDatabase();

    // Find the company and add the user as a member
    const company = await db.collection("companies").findOne({ _id: new ObjectId(companyId) });
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Get current user for email sending
    const currentUser = await db.collection("users").findOne({ email: session.user.email });

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteTokenHash = crypto
      .createHash("sha256")
      .update(inviteToken)
      .digest("hex");
    const inviteExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days

    // Check if user already exists
    let user = await db.collection("users").findOne({ email: normalizedEmail });

    if (!user) {
      const fallbackPassword = crypto.randomBytes(16).toString("hex");
      const hashedPassword = await bcrypt.hash(fallbackPassword, 12);

      const userData = {
        name: safeName,
        email: normalizedEmail,
        password: hashedPassword,
        role: role || "MEMBER",
        needsPasswordReset: true,
        inviteToken: inviteTokenHash,
        inviteExpires,
        pendingCompanyId: new ObjectId(companyId),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("users").insertOne(userData);
      user = { ...userData, _id: result.insertedId };
    } else {
      const memberRecord = (company.members || []).find(
        (member: any) => member.userId.toString() === user._id.toString()
      );

      if (memberRecord && memberRecord.status !== "PENDING") {
        return NextResponse.json(
          { message: "User is already a member of this company" },
          { status: 400 }
        );
      }

      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            inviteToken: inviteTokenHash,
            inviteExpires,
            pendingCompanyId: new ObjectId(companyId),
            ...((!user.name && safeName) ? { name: safeName } : {}),
            updatedAt: new Date(),
          }
        }
      );
    }

    // Upsert membership as pending
    const existingMemberIndex = (company.members || []).findIndex(
      (member: any) => member.userId.toString() === user._id.toString()
    );

    const memberData = {
      userId: new ObjectId(user._id),
      role: role || "MEMBER",
      joinedAt: new Date(),
      status: "PENDING",
      invitedBy: currentUser?._id,
      inviteToken: inviteTokenHash,
      inviteExpires,
    };

    if (existingMemberIndex === -1) {
      await db.collection("companies").updateOne(
        { _id: new ObjectId(companyId) },
        {
          $push: { members: memberData },
          $set: { updatedAt: new Date() }
        }
      );
    } else {
      await db.collection("companies").updateOne(
        { _id: new ObjectId(companyId) },
        {
          $set: {
            [`members.${existingMemberIndex}`]: memberData,
            updatedAt: new Date()
          }
        }
      );
    }

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

    // Get updated company data
    const updatedCompany = await db.collection("companies").findOne({ _id: new ObjectId(companyId) });

    return NextResponse.json(
      {
        message: "Team member invited successfully",
        company: updatedCompany,
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
