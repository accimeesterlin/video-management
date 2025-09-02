import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";

// GET - Fetch a specific company
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const company = await Company.findById(params.id).populate(
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
      (member: any) => member.userId._id.toString() === session.user.id
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description, website, industry, size, location } =
      await request.json();

    await dbConnect();

    const company = await Company.findById(params.id);

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner or admin
    const userMember = company.members.find(
      (member: any) => member.userId.toString() === session.user.id
    );

    if (!userMember || !["OWNER", "ADMIN"].includes(userMember.role)) {
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    const updatedCompany = await Company.findByIdAndUpdate(
      params.id,
      {
        name,
        description,
        website,
        industry,
        size,
        location,
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const company = await Company.findById(params.id);

    if (!company) {
      return NextResponse.json(
        { message: "Company not found" },
        { status: 404 }
      );
    }

    // Check if user is the owner
    const userMember = company.members.find(
      (member: any) => member.userId.toString() === session.user.id
    );

    if (!userMember || userMember.role !== "OWNER") {
      return NextResponse.json(
        { message: "Only owners can delete companies" },
        { status: 403 }
      );
    }

    await Company.findByIdAndDelete(params.id);

    return NextResponse.json({ message: "Company deleted successfully" });
  } catch (error) {
    console.error("Error deleting company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
