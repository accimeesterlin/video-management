import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: String,
  status: {
    type: String,
    enum: ["Active", "On Hold", "Completed", "Cancelled"],
    default: "Active",
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: Date,
  team: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  tasks: [{
    id: String,
    title: String,
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed", "On Hold", "Cancelled"],
      default: "Pending",
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    dueDate: Date,
  }],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

projectSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.Project || mongoose.model("Project", projectSchema);