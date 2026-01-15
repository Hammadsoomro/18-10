import mongoose from "mongoose";

// User Schema
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ["admin", "member"], required: true },
    active: { type: Boolean, default: true },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    teamId: { type: String, default: null },
    avatar: { type: String, default: null },
  },
  { timestamps: true },
);

// Contact Schema
const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: { type: String, default: "" },
    phone: { type: String, required: true },
    pinned: { type: Boolean, default: false },
    lastMessage: { type: String, default: null },
    lastMessageAt: { type: Date, default: null },
    unreadCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Message Schema
const messageSchema = new mongoose.Schema(
  {
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contact",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: { type: String, required: true },
    sender: { type: String, enum: ["user", "contact"], required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// NumberLine Schema
const numberLineSchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true },
    content: { type: String, required: true },
    lineNumber: { type: Number, required: true },
    status: {
      type: String,
      enum: ["queued", "distributed", "claimed", "sorted"],
      default: "queued",
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    distributedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    claimedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// DistributorSettings Schema
const distributorSettingsSchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true, unique: true },
    linesPerMember: { type: Number, default: 5 },
    timerSeconds: { type: Number, default: 60 },
    isActive: { type: Boolean, default: false },
    selectedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true },
);

// ClaimSettings Schema
const claimSettingsSchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true, unique: true },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    claimLineCount: { type: Number, default: 1 },
    cooldownSeconds: { type: Number, default: 60 },
  },
  { timestamps: true },
);

// Prevent model re-definition on hot reload
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Contact =
  mongoose.models.Contact || mongoose.model("Contact", contactSchema);
export const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);
export const NumberLine =
  mongoose.models.NumberLine || mongoose.model("NumberLine", numberLineSchema);
export const DistributorSettings =
  mongoose.models.DistributorSettings ||
  mongoose.model("DistributorSettings", distributorSettingsSchema);
export const ClaimSettings =
  mongoose.models.ClaimSettings ||
  mongoose.model("ClaimSettings", claimSettingsSchema);

export async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;

  // Optional MongoDB for development
  if (!mongoUri) {
    console.warn("⚠️  MONGODB_URI not set. Database features will not work.");
    return;
  }

  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.warn(
      "⚠️  MongoDB connection failed. Some features may not work:",
      (error as Error).message,
    );
  }
}
