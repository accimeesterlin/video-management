import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";

// GET - Fetch all companies for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get user by email first
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find companies where user is a member (using ObjectId)
    const companies = await Company.find({
      $or: [
        { ownerId: user._id },
        { "members.userId": user._id }
      ]
    }).populate("members.userId", "name email");

    return NextResponse.json(companies);
  } catch (error) {
    console.error("Error fetching companies:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new company
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description, website, industry, size, location } =
      await request.json();

    if (!name) {
      return NextResponse.json(
        { message: "Company name is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Get user by email first
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const company = await Company.create({
      name,
      description,
      website,
      industry,
      size,
      location,
      ownerId: user._id,
      members: [
        {
          userId: user._id,
          role: "OWNER",
        },
      ],
    });

    // Populate the members before returning
    const populatedCompany = await Company.findById(company._id).populate("members.userId", "name email");

    return NextResponse.json(populatedCompany, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update company information
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description, website, industry, size, location, founded } =
      await request.json();

    await dbConnect();

    // Get user by email first
    const user = await User.findOne({ email: session.user?.email });
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Find user's company
    const company = await Company.findOne({
      $or: [
        { ownerId: user._id },
        { "members.userId": user._id }
      ]
    });

    if (!company) {
      return NextResponse.json({ message: "Company not found" }, { status: 404 });
    }

    // Check if user has permission to update (owner or admin)
    const isOwner = company.ownerId.toString() === user._id.toString();
    const userMember = company.members.find(
      (member: any) => member.userId.toString() === user._id.toString()
    );
    const isAdmin = userMember && (userMember.role === "ADMIN" || userMember.role === "OWNER");

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { message: "Insufficient permissions to update company" },
        { status: 403 }
      );
    }

    // Update company information
    const updateData: any = { updatedAt: new Date() };
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (website !== undefined) updateData.website = website;
    if (industry !== undefined) updateData.industry = industry;
    if (size !== undefined) updateData.size = size;
    if (location !== undefined) updateData.location = location;
    if (founded !== undefined) updateData.founded = founded;

    const updatedCompany = await Company.findByIdAndUpdate(
      company._id,
      updateData,
      { new: true }
    ).populate("members.userId", "name email");

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
