import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Company from "@/models/Company";

// GET - Fetch all companies for the authenticated user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Find companies where user is a member
    const companies = await Company.find({
      "members.userId": session.user?.email,
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

    const company = await Company.create({
      name,
      description,
      website,
      industry,
      size,
      location,
      ownerId: session.user?.email,
      members: [
        {
          userId: session.user?.email,
          role: "OWNER",
        },
      ],
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Error creating company:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
