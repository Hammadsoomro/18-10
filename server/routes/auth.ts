import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { User } from "../db";
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
    const jwt = require("jsonwebtoken");
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
