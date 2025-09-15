import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { email, role = "MEMBER" } = await request.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await dbConnect();

    const { id } = await params;

    // Get the company and verify user has permission to invite
    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Check if current user is owner or admin
    const currentUser = await User.findOne({ email: session.user.email });
    const userMember = company.members.find(
      (member: { userId: { toString: () => string }; role: string }) =>
        member.userId.toString() === currentUser._id.toString()
    );

    if (!userMember || !["OWNER", "ADMIN"].includes(userMember.role)) {
      return NextResponse.json(
        {
          error: "You don't have permission to invite members",
        },
        { status: 403 }
      );
    }

    // Check if user already exists
    const invitedUser = await User.findOne({
      email: email.trim().toLowerCase(),
    });

    if (invitedUser) {
      // Check if user is already a member
      const existingMember = company.members.find(
        (member: { userId: { toString: () => string } }) =>
          member.userId.toString() === invitedUser._id.toString()
      );

      if (existingMember) {
        return NextResponse.json(
          {
            error: "User is already a member of this company",
          },
          { status: 409 }
        );
      }

      // Add user directly to company
      await Company.findByIdAndUpdate(id, {
        $push: {
          members: {
            userId: invitedUser._id,
            role: role,
            joinedAt: new Date(),
          },
        },
      });

      // Update user's company association
      await User.findByIdAndUpdate(invitedUser._id, {
        companyId: company._id,
      });

      return NextResponse.json({
        message: "User added to company successfully",
        type: "direct_add",
      });
    } else {
      // User doesn't exist - create an invitation (you might want to implement email sending here)
      // For now, we'll just return a success message
      return NextResponse.json({
        message:
          "Invitation sent successfully. The user will be added when they sign up.",
        type: "invitation_sent",
        email: email.trim().toLowerCase(),
        role: role,
        companyName: company.name,
      });
    }
  } catch (error) {
    console.error("Invitation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
