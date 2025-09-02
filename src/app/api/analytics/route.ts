import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    
    // Get user's company
    const user = await db.collection("users").findOne({ email: session.user.email });
    if (!user?.companyId) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    const companyId = user.companyId;
    
    // Get project metrics
    const projects = await db.collection("projects").find({ companyId }).toArray();
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === "active").length;
    const completedProjects = projects.filter(p => p.status === "completed").length;
    const onHoldProjects = projects.filter(p => p.status === "on_hold").length;
    
    // Calculate average completion time for completed projects
    const completedProjectsWithDates = projects.filter(p => p.status === "completed" && p.completedAt && p.createdAt);
    const avgCompletionTime = completedProjectsWithDates.length > 0 
      ? Math.round(completedProjectsWithDates.reduce((sum, project) => {
          const completionTime = new Date(project.completedAt).getTime() - new Date(project.createdAt).getTime();
          return sum + (completionTime / (1000 * 60 * 60 * 24)); // Convert to days
        }, 0) / completedProjectsWithDates.length)
      : 0;
    
    const successRate = totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0;

    // Get team metrics
    const teamMembers = await db.collection("users").find({ companyId }).toArray();
    const totalMembers = teamMembers.length;
    const activeMembers = teamMembers.filter(m => m.lastActive && 
      new Date(m.lastActive) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Active in last 7 days
    ).length;
    
    const avgProjectsPerMember = totalMembers > 0 ? (totalProjects / totalMembers) : 0;

    // Get video metrics
    const videos = await db.collection("videos").find({ companyId }).toArray();
    const totalVideos = videos.length;
    const currentMonth = new Date().getMonth();
    const videosThisMonth = videos.filter(v => new Date(v.uploadedAt).getMonth() === currentMonth).length;
    
    const avgVideoLength = videos.length > 0 
      ? Math.round(videos.reduce((sum, video) => sum + (video.duration || 0), 0) / videos.length)
      : 0;

    // Get monthly data for the last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const month = date.toLocaleString('default', { month: 'short' });
      
      const monthProjects = projects.filter(p => {
        const createdDate = new Date(p.createdAt);
        return createdDate.getMonth() === date.getMonth() && createdDate.getFullYear() === date.getFullYear();
      }).length;
      
      const monthVideos = videos.filter(v => {
        const uploadDate = new Date(v.uploadedAt);
        return uploadDate.getMonth() === date.getMonth() && uploadDate.getFullYear() === date.getFullYear();
      }).length;
      
      const monthTeamMembers = teamMembers.filter(m => {
        const joinDate = new Date(m.createdAt);
        return joinDate <= date;
      }).length;
      
      monthlyData.push({
        month,
        projects: monthProjects,
        videos: monthVideos,
        teamMembers: monthTeamMembers,
      });
    }

    // Get team performance data
    const teamPerformance = teamMembers.map(member => {
      const memberProjects = projects.filter(p => p.assignedTo === member._id).length;
      const memberVideos = videos.filter(v => v.uploadedBy === member._id).length;
      
      // Calculate rating based on projects completed and video uploads
      const rating = Math.min(10, Math.max(1, 
        (memberProjects * 0.3 + memberVideos * 0.2 + 7) // Base rating of 7
      ));
      
      return {
        name: member.name,
        projects: memberProjects,
        videos: memberVideos,
        rating: Number(rating.toFixed(1)),
      };
    }).sort((a, b) => b.rating - a.rating);

    const analytics = {
      projectMetrics: {
        totalProjects,
        activeProjects,
        completedProjects,
        onHoldProjects,
        avgCompletionTime: avgCompletionTime > 0 ? `${avgCompletionTime} days` : "N/A",
        successRate: `${successRate}%`,
      },
      teamMetrics: {
        totalMembers,
        activeMembers,
        avgProjectsPerMember: Number(avgProjectsPerMember.toFixed(1)),
        avgResponseTime: "4.2 hours", // This would need more complex calculation
        productivityScore: `${Math.min(10, Math.max(1, (activeMembers / totalMembers) * 10)).toFixed(1)}/10`,
      },
      videoMetrics: {
        totalVideos,
        videosThisMonth,
        avgVideoLength: avgVideoLength > 0 ? `${Math.floor(avgVideoLength / 60)}:${(avgVideoLength % 60).toString().padStart(2, '0')}` : "0:00",
        processingTime: "2.1 days", // This would need actual processing time tracking
        qualityScore: "9.1/10", // This would need quality metrics
      },
      monthlyData,
      projectStatusData: [
        { status: "Completed", count: completedProjects, percentage: totalProjects > 0 ? Math.round((completedProjects / totalProjects) * 100) : 0 },
        { status: "Active", count: activeProjects, percentage: totalProjects > 0 ? Math.round((activeProjects / totalProjects) * 100) : 0 },
        { status: "On Hold", count: onHoldProjects, percentage: totalProjects > 0 ? Math.round((onHoldProjects / totalProjects) * 100) : 0 },
      ],
      teamPerformance: teamPerformance.slice(0, 10), // Top 10 performers
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}