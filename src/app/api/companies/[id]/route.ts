import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";
import User from "@/models/User";

// GET - Fetch a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    // First get the user to find their ID
    const user = await User.findOne({ email: session.user.email });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const company = await Company.findById(id).populate(
      "members.userId",
      "name email"
    );

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user is a member of this company
    const isMember = company.members.some(
      (member: { userId: { _id: { toString: () => string } } }) =>
        member.userId._id.toString() === user._id.toString()
    );

    if (!isMember) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error fetching company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update a company
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      name,
      description,
      website,
      industry,
      size,
      location,
      founded,
      address,
      phone,
    } = await request.json();

    await dbConnect();

    const { id } = await params;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Get the user first
    const user = await User.findOne({ email: session.user?.email });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is the owner or admin
    const userMember = company.members.find(
      (member: { userId: { toString: () => string }; role: string }) =>
        member.userId.toString() === user._id.toString()
    );

    if (!userMember || !["OWNER", "ADMIN"].includes(userMember.role)) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      {
        name,
        description,
        website,
        industry,
        size,
        location,
        founded,
        address,
        phone,
        updatedAt: new Date(),
      },
      { new: true }
    );

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error("Error updating company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a company
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { id } = await params;

    const company = await Company.findById(id);

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Get the user first  
    const user = await User.findOne({ email: session.user?.email });
    
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Check if user is the owner
    const userMember = company.members.find(
      (member: { userId: { toString: () => string }; role: string }) =>
        member.userId.toString() === user._id.toString()
    );

    if (!userMember || userMember.role !== "OWNER") {
      return NextResponse.json(
        { message: "Only owners can delete companies" },
        { status: 403 }
      );
    }

    await Company.findByIdAndDelete(id);

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
