import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["ADMIN", "MANAGER", "EDITOR", "REVIEWER", "MEMBER"],
    default: "MEMBER",
  },
  avatar: {
    type: String,
    default: "",
  },
  phone: String,
  location: String,
  bio: String,
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },
  needsPasswordReset: {
    type: Boolean,
    default: false,
  },
  inviteToken: String,
  inviteExpires: Date,
  pendingCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.models.User || mongoose.model("User", userSchema);
