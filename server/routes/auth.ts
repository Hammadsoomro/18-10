import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, ClaimSettings, DistributorSettings, NumberLine } from "../db";
import { generateToken } from "../utils/jwt";
import { AuthResponse, SignupRequest, LoginRequest } from "@shared/api";

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const { email, password, name } = req.body as SignupRequest;

    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const teamId = `team_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const user = new User({
      email,
      passwordHash,
      name,
      role: "admin",
      teamId,
    });

    await user.save();

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      teamId: user.teamId,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        teamId: user.teamId,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password } = req.body as LoginRequest;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      adminId: user.adminId?.toString(),
      teamId: user.teamId,
    });

    const response: AuthResponse = {
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        adminId: user.adminId?.toString(),
        teamId: user.teamId,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

export const handleCreateMember: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Verify admin token and get admin details
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const admin = await User.findById(decoded.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create members" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const member = new User({
      email,
      passwordHash,
      name,
      role: "member",
      adminId: admin._id,
      teamId: admin.teamId,
    });

    await member.save();

    const memberToken = generateToken({
      id: member._id.toString(),
      email: member.email,
      name: member.name,
      role: member.role,
      adminId: member.adminId?.toString(),
      teamId: member.teamId,
    });

    const response: AuthResponse = {
      token: memberToken,
      user: {
        id: member._id.toString(),
        email: member.email,
        name: member.name,
        role: member.role,
        adminId: member.adminId?.toString(),
        teamId: member.teamId,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Create member error:", error);
    res.status(500).json({ error: "Failed to create member" });
  }
};

export const handleGetClaimSettings: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let claimSettings = await ClaimSettings.findOne({ teamId: user.teamId });

    if (!claimSettings) {
      claimSettings = new ClaimSettings({
        teamId: user.teamId,
        adminId: user.role === "admin" ? user._id : user.adminId,
        claimLineCount: 1,
        cooldownSeconds: 60,
      });
      await claimSettings.save();
    }

    res.json({
      claimLineCount: claimSettings.claimLineCount,
      cooldownSeconds: claimSettings.cooldownSeconds,
    });
  } catch (error) {
    console.error("Get claim settings error:", error);
    res.status(500).json({ error: "Failed to get claim settings" });
  }
};

export const handleSaveClaimSettings: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can modify claim settings" });
    }

    const { claimLineCount, cooldownSeconds } = req.body;

    if (
      typeof claimLineCount !== "number" ||
      typeof cooldownSeconds !== "number"
    ) {
      return res.status(400).json({ error: "Invalid claim settings values" });
    }

    let claimSettings = await ClaimSettings.findOne({ teamId: user.teamId });

    if (!claimSettings) {
      claimSettings = new ClaimSettings({
        teamId: user.teamId,
        adminId: user._id,
        claimLineCount,
        cooldownSeconds,
      });
    } else {
      claimSettings.claimLineCount = claimLineCount;
      claimSettings.cooldownSeconds = cooldownSeconds;
    }

    await claimSettings.save();

    res.json({
      message: "Claim settings saved successfully",
      claimLineCount: claimSettings.claimLineCount,
      cooldownSeconds: claimSettings.cooldownSeconds,
    });
  } catch (error) {
    console.error("Save claim settings error:", error);
    res.status(500).json({ error: "Failed to save claim settings" });
  }
};

export const handleGetMembers: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let members = [];

    if (user.role === "admin") {
      members = await User.find({ teamId: user.teamId, role: "member" }).select(
        "_id id name email active",
      );
    } else {
      const admin = await User.findById(user.adminId).select("teamId");
      if (admin) {
        members = await User.find({
          teamId: admin.teamId,
          role: "member",
        }).select("_id id name email active");
      }
    }

    const formattedMembers = members.map((member: any) => ({
      id: member._id.toString(),
      name: member.name,
      email: member.email,
      active: member.active ?? true,
    }));

    res.json({ members: formattedMembers });
  } catch (error) {
    console.error("Get members error:", error);
    res.status(500).json({ error: "Failed to get members" });
  }
};

export const handleUpdateMember: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const admin = await User.findById(decoded.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update members" });
    }

    const memberId = req.params.id;
    const { active } = req.body;
    if (typeof active !== "boolean") {
      return res.status(400).json({ error: "Invalid active value" });
    }

    const member = await User.findById(memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    if (String(member.teamId) !== String(admin.teamId)) {
      return res
        .status(403)
        .json({ error: "Cannot modify member from another team" });
    }

    member.active = active;
    await member.save();

    res.json({
      message: "Member updated",
      member: {
        id: member._id.toString(),
        name: member.name,
        email: member.email,
        active: member.active,
      },
    });
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
};

export const handleDeleteMember: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const admin = await User.findById(decoded.id);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete members" });
    }

    const memberId = req.params.id;
    const member = await User.findById(memberId);
    if (!member) return res.status(404).json({ error: "Member not found" });
    if (String(member.teamId) !== String(admin.teamId)) {
      return res
        .status(403)
        .json({ error: "Cannot delete member from another team" });
    }

    await User.findByIdAndDelete(memberId);
    res.json({ message: "Member deleted" });
  } catch (error) {
    console.error("Delete member error:", error);
    res.status(500).json({ error: "Failed to delete member" });
  }
};

export const handleChangePassword: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Missing password fields" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return res
        .status(400)
        .json({ error: "New password must be at least 6 characters" });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ error: "Failed to change password" });
  }
};

export const handleGetDistributorSettings: RequestHandler = async (
  req,
  res,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const DistributorSettings = require("../db").DistributorSettings;
    let settings = await DistributorSettings.findOne({
      teamId: user.teamId,
    }).populate("selectedMembers", "name email");

    if (!settings) {
      settings = new DistributorSettings({
        teamId: user.teamId,
        linesPerMember: 5,
        timerSeconds: 60,
        isActive: false,
        selectedMembers: [],
      });
      await settings.save();
    }

    const formattedMembers = settings.selectedMembers.map((m: any) => ({
      id: m._id.toString(),
      name: m.name,
      email: m.email,
    }));

    res.json({
      linesPerMember: settings.linesPerMember,
      timerSeconds: settings.timerSeconds,
      isActive: settings.isActive,
      selectedMembers: formattedMembers,
    });
  } catch (error) {
    console.error("Get distributor settings error:", error);
    res.status(500).json({ error: "Failed to get distributor settings" });
  }
};

export const handleSaveDistributorSettings: RequestHandler = async (
  req,
  res,
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-secret-key-change-in-production",
    ) as any;

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.role !== "admin") {
      return res
        .status(403)
        .json({ error: "Only admins can modify distributor settings" });
    }

    const { linesPerMember, timerSeconds, isActive, selectedMembers } =
      req.body;

    const DistributorSettings = require("../db").DistributorSettings;
    let settings = await DistributorSettings.findOne({
      teamId: user.teamId,
    });

    if (!settings) {
      settings = new DistributorSettings({
        teamId: user.teamId,
        linesPerMember,
        timerSeconds,
        isActive,
        selectedMembers,
      });
    } else {
      settings.linesPerMember = linesPerMember;
      settings.timerSeconds = timerSeconds;
      settings.isActive = isActive;
      settings.selectedMembers = selectedMembers;
    }

    await settings.save();

    // Start or stop the server-side distributor loop for this team
    try {
      const app = (req as any).app;
      if (!app.locals.distributorLoops) app.locals.distributorLoops = {};

      const teamKey = String(user.teamId);
      // clear existing loop if any
      if (app.locals.distributorLoops[teamKey]) {
        clearInterval(app.locals.distributorLoops[teamKey]);
        delete app.locals.distributorLoops[teamKey];
      }

      if (settings.isActive) {
        // start a new loop
        const startLoop = async () => {
          const io = app.get("io");
          const DistributorSettingsModel = require("../db").DistributorSettings;
          const NumberLineModel = require("../db").NumberLine;

          const currentSettings = await DistributorSettingsModel.findOne({
            teamId: teamKey,
          }).populate("selectedMembers");
          if (!currentSettings || !currentSettings.isActive) return;

          const members = currentSettings.selectedMembers || [];
          const linesPerMemberLocal = currentSettings.linesPerMember || 1;

          const claimedLines: any[] = [];

          for (const member of members) {
            if (!member || !member._id) continue;
            for (let i = 0; i < linesPerMemberLocal; i++) {
              // claim the next available 'distributed' line for this team
              const claimed = await NumberLineModel.findOneAndUpdate(
                { teamId: teamKey, status: "distributed" },
                {
                  $set: {
                    status: "claimed",
                    claimedBy: member._id,
                    claimedAt: new Date(),
                  },
                  $push: { distributedTo: member._id },
                },
                { new: true, sort: { createdAt: 1 } },
              );
              if (claimed) {
                // attach assigned member name for client display
                claimedLines.push({
                  id: claimed._id,
                  lineNumber: claimed.lineNumber,
                  content: claimed.content,
                  claimedAt: claimed.claimedAt,
                  claimedBy: member._id,
                  claimedByName: member.name,
                  distributedTo: claimed.distributedTo || [],
                  status: "claimed",
                });
              } else break; // no more lines for this member
            }
          }

          if (claimedLines.length > 0) {
            // emit real-time update to team room
            try {
              if (io) {
                io.to(`team_${teamKey}`).emit("distributed_lines", {
                  lines: claimedLines.map((l) => ({
                    id: l.id,
                    lineNumber: l.lineNumber,
                    content: l.content,
                    claimedAt: l.claimedAt,
                    claimedBy: l.claimedBy,
                    claimedByName: l.claimedByName,
                    distributedTo: l.distributedTo || [],
                    status: l.status,
                  })),
                });
                io.to(`team_${teamKey}`).emit("distributor_indicator", {
                  active: true,
                });
              }
            } catch (e) {
              console.error("Socket emit error:", e);
            }
          }
        };

        // Immediately run once, then set interval based on timerSeconds
        await startLoop();
        const interval = setInterval(
          async () => {
            try {
              await startLoop();
            } catch (e) {
              console.error("Distributor loop error:", e);
            }
          },
          Math.max(1000, (settings.timerSeconds || 60) * 1000),
        );

        app.locals.distributorLoops[teamKey] = interval;
      }
    } catch (e) {
      console.error("Failed to start/stop distributor loop:", e);
    }

    res.json({
      message: "Distributor settings saved successfully",
      linesPerMember: settings.linesPerMember,
      timerSeconds: settings.timerSeconds,
      isActive: settings.isActive,
    });
  } catch (error) {
    console.error("Save distributor settings error:", error);
    res.status(500).json({ error: "Failed to save distributor settings" });
  }
};
