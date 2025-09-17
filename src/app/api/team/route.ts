import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Company from "@/models/Company";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { emailService } from "@/lib/email";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

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
              status: "Active",
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

    // Validate ObjectId format
    if (!ObjectId.isValid(companyId)) {
      return NextResponse.json(
        { message: "Invalid company ID" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user (for invitation, password will be set when they sign up)
      user = new User({
        name,
        email,
        password: "temp_password", // This should be handled differently in real app
        role: role || "MEMBER",
      });
      await user.save();
    }

    // Find the company and add the user as a member
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const isAlreadyMember = company.members.some(
      (member: { userId: { toString: () => string } }) =>
        member.userId.toString() === user._id.toString()
    );

    if (isAlreadyMember) {
      return NextResponse.json(
        { message: "User is already a member of this company" },
        { status: 400 }
      );
    }

    // Add user to company members
    company.members.push({
      userId: user._id,
      role: role || "MEMBER",
      joinedAt: new Date(),
    });

    await company.save();

    // Get current user for email sending
    const currentUser = await User.findOne({ email: session.user.email });
    
    // Send invitation email
    try {
      await emailService.sendProjectInvitation(
        email,
        `${company.name} Team`,
        currentUser?.name || "Team Admin",
        `${process.env.NEXTAUTH_URL}/dashboard/team?invited=true`, // Replace with actual invite URL
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
