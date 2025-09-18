import mongoose from "mongoose";

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  logo: String,
  website: String,
  industry: String,
  size: String,
  founded: String,
  location: String,
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  members: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      role: {
        type: String,
        enum: ["OWNER", "ADMIN", "MANAGER", "MEMBER"],
        default: "MEMBER",
      },
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      status: {
        type: String,
        enum: ["ACTIVE", "PENDING"],
        default: "ACTIVE",
      },
      invitedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      inviteToken: String,
      inviteExpires: Date,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

companySchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Company ||
  mongoose.model("Company", companySchema);
