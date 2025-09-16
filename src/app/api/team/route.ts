import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Company from "@/models/Company";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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
        role: role || "EDITOR",
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
