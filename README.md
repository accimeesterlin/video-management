# 🎬 Video Editor Management App

A modern, professional video editor management platform built with Next.js 15, MongoDB, and a beautiful Calendly-inspired design. Streamline your video editing workflow with powerful project management, team collaboration, and real-time feedback tools.

## ✨ Features

### Core Functionality

- **Company Management**: Create and manage multiple companies with hierarchical structures
- **Team Management**: Invite team members, assign roles, and track performance
- **Project Management**: Organize video editing projects with tasks and deadlines
- **Video Management**: Upload videos, add timestamp-based comments, and collaborate
- **Resource Management**: Upload and organize project assets and files
- **Dashboard Overview**: Comprehensive overview of all activities and metrics

### Advanced Features

- **Real-time Comments**: Add comments at specific video timestamps for precise feedback
- **Progress Tracking**: Monitor project completion and team productivity
- **Role-based Access Control**: Secure permissions for different user roles
- **Analytics & Insights**: Track performance metrics and gain insights
- **Modern Authentication**: Secure login with NextAuth.js

### User Experience

- **Calendly-inspired Design**: Clean, modern interface with light borders and smooth animations
- **Responsive Design**: Works perfectly on all devices
- **Intuitive Navigation**: Easy-to-use sidebar and header navigation
- **Toast Notifications**: Real-time feedback for user actions
- **Loading States**: Smooth user experience with proper loading indicators

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4 with custom design system
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: NextAuth.js with MongoDB adapter
- **UI Components**: Custom components with modern design patterns
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **Notifications**: Sonner toast notifications

## 📋 Prerequisites

- Node.js 18+
- npm or yarn package manager
- MongoDB database (local or cloud)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd video-editor-management
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

Create a `.env.local` file in the root directory:

```env
MONGODB_URI="mongodb://localhost:27017/video-editor-management"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup

Ensure MongoDB is running locally or update the `MONGODB_URI` to point to your cloud database.

### 5. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to see your application!

## 🔐 Authentication

The application uses NextAuth.js with a credentials provider:

- **Sign Up**: Create account with company
- **Sign In**: Email/password authentication
- **Session Management**: Secure JWT-based sessions
- **Role-based Access**: Different permissions for different user roles

## 🗄️ Database Schema

### Core Models

- **User**: User accounts with roles and permissions
- **Company**: Organizations that users belong to
- **CompanyMember**: User-company relationships with roles
- **Project**: Video editing projects with tasks
- **Video**: Video content with metadata
- **Task**: Individual tasks within projects
- **Comment**: Timestamp-based video comments
- **Resource**: Project assets and files

## 🎨 Design System

### Color Palette

- **Primary**: Blue (#3B82F6) for main actions and branding
- **Secondary**: Gray tones for backgrounds and borders
- **Success**: Green for positive states
- **Warning**: Yellow for caution states
- **Error**: Red for error states

### Typography

- **Headings**: Bold, clear hierarchy
- **Body**: Readable, medium weight
- **Captions**: Small, subtle text

### Components

- **Cards**: Clean, shadow-based design with light borders
- **Buttons**: Modern, rounded buttons with hover effects
- **Inputs**: Clean form fields with focus states
- **Modals**: Centered, backdrop-blur overlays

## 📱 Pages & Features

### Dashboard

- Overview of active projects and recent activity
- Quick action buttons for common tasks
- Getting started guide for new users

### Companies

- Manage company information and settings
- View company statistics and member counts
- Create, edit, and delete companies
- Role-based permissions for company management

### Team

- Invite and manage team members
- View team performance metrics
- Assign roles and permissions

### Projects

- Create and manage video editing projects
- Track project progress and deadlines
- Assign tasks to team members

### Videos

- Upload and organize video content
- Add timestamp-based comments
- Collaborate with team members

### Analytics

- Project performance metrics
- Team productivity insights
- Video production statistics

### Settings

- User profile management
- Company information
- Notification preferences
- Security settings

## 🚀 Deployment

### Environment Variables

Ensure these environment variables are set in production:

- `MONGODB_URI`: MongoDB connection string
- `NEXTAUTH_SECRET`: Secure random string for JWT signing
- `NEXTAUTH_URL`: Your application URL

### Database

For production, consider using:

- MongoDB Atlas (cloud MongoDB service)
- Self-hosted MongoDB cluster
- Other MongoDB-compatible databases

### Deployment Platforms

- Vercel (recommended for Next.js)
- Netlify
- AWS, Google Cloud, or Azure
- Docker containers

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Structure

```
src/
├── app/             # Next.js App Router pages
├── components/      # Reusable UI components
├── lib/            # Utility functions and configurations
├── models/         # Mongoose database models
└── types/          # TypeScript type definitions
```

### Database Management

```bash
# Connect to MongoDB
mongosh "mongodb://localhost:27017/video-editor-management"

# View collections
show collections

# Query data
db.companies.find()
db.users.find()
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the documentation
- Review the code examples

## 🎯 Roadmap

- [ ] Real-time collaboration features
- [ ] Advanced video editing tools
- [ ] Mobile app development
- [ ] API integrations with video platforms
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Dark mode theme
- [ ] Advanced file management
- [ ] Team communication tools
- [ ] Client portal and feedback system

---

Built with ❤️ using modern web technologies for the best developer and user experience.
