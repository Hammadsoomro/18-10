import { RequestHandler } from "express";
import { NumberLine } from "../db";
import { verifyToken } from "../utils/jwt";

export const handleGetLines: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const lines = await NumberLine.find({
      teamId: decoded.teamId,
      $or: [{ status: "queued" }, { status: "claimed", claimedBy: decoded.id }],
    })
      .populate("claimedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ lines });
  } catch (error) {
    console.error("Get lines error:", error);
    res.status(500).json({ error: "Failed to fetch lines" });
  }
};

export const handleCreateLine: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const existingLines = await NumberLine.find({ teamId: decoded.teamId });
    const lineNumber = existingLines.length + 1;

    const line = new NumberLine({
      teamId: decoded.teamId,
      content,
      lineNumber,
      status: "queued",
    });

    await line.save();
    res.json(line);
  } catch (error) {
    console.error("Create line error:", error);
    res.status(500).json({ error: "Failed to create line" });
  }
};

export const handleCreateLines: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { contents } = req.body;
    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: "Contents array is required" });
    }

    const existingLines = await NumberLine.find({ teamId: decoded.teamId });
    const startLineNumber = existingLines.length + 1;

    const newLines = contents.map((content, index) => ({
      teamId: decoded.teamId,
      content,
      lineNumber: startLineNumber + index,
      status: "queued" as const,
    }));

    const createdLines = await NumberLine.insertMany(newLines);
    res.json({ lines: createdLines });
  } catch (error) {
    console.error("Create lines error:", error);
    res.status(500).json({ error: "Failed to create lines" });
  }
};

export const handleDeleteLine: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { id } = req.params;
    const line = await NumberLine.findByIdAndDelete(id);

    if (!line) {
      return res.status(404).json({ error: "Line not found" });
    }

    res.json({ message: "Line deleted" });
  } catch (error) {
    console.error("Delete line error:", error);
    res.status(500).json({ error: "Failed to delete line" });
  }
};

export const handleMoveToQueue: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { lineIds } = req.body;
    if (!Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({ error: "Line IDs are required" });
    }

    const updatedLines = await NumberLine.updateMany(
      { _id: { $in: lineIds }, teamId: decoded.teamId },
      { status: "queued", claimedBy: null },
    );

    res.json({
      message: "Lines moved to queue",
      modifiedCount: updatedLines.modifiedCount,
    });
  } catch (error) {
    console.error("Move to queue error:", error);
    res.status(500).json({ error: "Failed to move lines" });
  }
};

export const handleMoveToDistributor: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { lineIds } = req.body;
    if (!Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({ error: "Line IDs are required" });
    }

    const updatedLines = await NumberLine.updateMany(
      { _id: { $in: lineIds }, teamId: decoded.teamId },
      { status: "distributed" },
    );

    res.json({
      message: "Lines moved to distributor",
      modifiedCount: updatedLines.modifiedCount,
    });
  } catch (error) {
    console.error("Move to distributor error:", error);
    res.status(500).json({ error: "Failed to move lines" });
  }
};

export const handleGetQueuedLines: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const lines = await NumberLine.find({
      teamId: decoded.teamId,
      status: "queued",
    })
      .populate("claimedBy", "name email")
      .sort({ createdAt: -1 });

    res.json({ lines });
  } catch (error) {
    console.error("Get queued lines error:", error);
    res.status(500).json({ error: "Failed to fetch queued lines" });
  }
};

export const handleGetClaimedLines: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const isAdmin = decoded.role === "admin";
    const match: any = {
      teamId: decoded.teamId,
      status: { $in: ["claimed", "distributed"] },
    };

    if (!isAdmin) {
      match.claimedBy = decoded.id;
    }

    const lines = await NumberLine.find(match)
      .populate("claimedBy", "name email")
      .sort({ updatedAt: -1 });

    res.json({ lines });
  } catch (error) {
    console.error("Get claimed lines error:", error);
    res.status(500).json({ error: "Failed to fetch claimed lines" });
  }
};

export const handleClaimLine: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { lineId } = req.body;
    if (!lineId) {
      return res.status(400).json({ error: "Line ID is required" });
    }

    const line = await NumberLine.findOneAndUpdate(
      { _id: lineId, teamId: decoded.teamId, status: "queued", claimedBy: null },
      { $set: { status: "claimed", claimedBy: decoded.id, claimedAt: new Date() } },
      { new: true },
    );

    if (!line) {
      return res.status(409).json({ error: "Line already claimed or unavailable" });
    }

    res.json(line);
  } catch (error) {
    console.error("Claim line error:", error);
    res.status(500).json({ error: "Failed to claim line" });
  }
};

export const handleGetStats: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    const teamId = decoded.teamId;

    // Total numbers for team
    const totalNumbers = await NumberLine.countDocuments({ teamId });

    // Queued lines
    const queuedLines = await NumberLine.countDocuments({ teamId, status: 'queued' });

    // Active members count
    const { User } = require('../db');
    const activeMembers = await User.countDocuments({ teamId, role: 'member', active: true });

    // Claimed today (since midnight)
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const claimedToday = await NumberLine.countDocuments({ teamId, status: 'claimed', claimedAt: { $gte: startOfDay } });

    res.json({ totalNumbers, queuedLines, activeMembers, claimedToday });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};
