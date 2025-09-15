import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

interface SearchResult {
  id: string;
  type: "video" | "project" | "company" | "team";
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  relevance: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const filter = searchParams.get("filter") || "all";

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // Get user for access control
    const user = await db
      .collection("users")
      .findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const results: SearchResult[] = [];
    const searchRegex = new RegExp(query, "i");

    // Search videos
    if (filter === "all" || filter === "video") {
      const videos = await db
        .collection("videos")
        .find({
          $and: [
            {
              $or: [{ uploadedBy: user._id }, { companyId: user.companyId }],
            },
            {
              $or: [
                { title: searchRegex },
                { description: searchRegex },
                { project: searchRegex },
                { tags: { $in: [searchRegex] } },
              ],
            },
          ],
        })
        .toArray();

      for (const video of videos) {
        // Get uploader name
        const uploader = await db
          .collection("users")
          .findOne({ _id: video.uploadedBy });

        results.push({
          id: video._id.toString(),
          type: "video",
          title: video.title,
          description: video.description || `Video from ${video.project}`,
          metadata: {
            duration: video.duration,
            uploadedAt: video.uploadedAt,
            uploadedBy: uploader?.name || uploader?.email || "Unknown",
            project: video.project,
            status: video.status,
            size: video.size,
          },
          relevance: calculateRelevance(query, video.title, video.description),
        });
      }
    }

    // Search projects
    if (filter === "all" || filter === "project") {
      const projects = await db
        .collection("projects")
        .find({
          $and: [
            {
              $or: [{ createdBy: user._id }, { companyId: user.companyId }],
            },
            {
              $or: [
                { name: searchRegex },
                { description: searchRegex },
                { status: searchRegex },
              ],
            },
          ],
        })
        .toArray();

      for (const project of projects) {
        results.push({
          id: project._id.toString(),
          type: "project",
          title: project.name,
          description: project.description || "No description available",
          metadata: {
            status: project.status,
            createdAt: project.createdAt,
            dueDate: project.dueDate,
            priority: project.priority,
          },
          relevance: calculateRelevance(
            query,
            project.name,
            project.description
          ),
        });
      }
    }

    // Search companies
    if (filter === "all" || filter === "company") {
      const companies = await db
        .collection("companies")
        .find({
          $or: [
            { name: searchRegex },
            { description: searchRegex },
            { industry: searchRegex },
          ],
        })
        .toArray();

      for (const company of companies) {
        results.push({
          id: company._id.toString(),
          type: "company",
          title: company.name,
          description: company.description || `${company.industry} company`,
          metadata: {
            industry: company.industry,
            size: company.size,
            location: company.location,
            createdAt: company.createdAt,
          },
          relevance: calculateRelevance(
            query,
            company.name,
            company.description
          ),
        });
      }
    }

    // Search team members
    if (filter === "all" || filter === "team") {
      const teamMembers = await db
        .collection("users")
        .find({
          $and: [
            { companyId: user.companyId },
            {
              $or: [
                { name: searchRegex },
                { email: searchRegex },
                { role: searchRegex },
              ],
            },
          ],
        })
        .toArray();

      for (const member of teamMembers) {
        results.push({
          id: member._id.toString(),
          type: "team",
          title: member.name || member.email,
          description: `${member.role} - ${member.email}`,
          metadata: {
            role: member.role,
            email: member.email,
            createdAt: member.createdAt,
            lastLogin: member.lastLogin,
          },
          relevance: calculateRelevance(query, member.name, member.email),
        });
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevance - a.relevance);

    return NextResponse.json({
      query,
      filter,
      results,
      count: results.length,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

function calculateRelevance(
  query: string,
  title: string = "",
  description: string = ""
): number {
  const queryLower = query.toLowerCase();
  const titleLower = title.toLowerCase();
  const descriptionLower = description.toLowerCase();

  let relevance = 0;

  // Exact title match
  if (titleLower === queryLower) {
    relevance += 100;
  }
  // Title starts with query
  else if (titleLower.startsWith(queryLower)) {
    relevance += 80;
  }
  // Title contains query
  else if (titleLower.includes(queryLower)) {
    relevance += 60;
  }

  // Description contains query
  if (descriptionLower.includes(queryLower)) {
    relevance += 30;
  }

  // Word boundary matches get higher score
  const words = queryLower.split(" ");
  for (const word of words) {
    if (titleLower.includes(word)) {
      relevance += 20;
    }
    if (descriptionLower.includes(word)) {
      relevance += 10;
    }
  }

  return relevance;
}
