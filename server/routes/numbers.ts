import { RequestHandler } from "express";
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

    // Admins see 'staged' lines (sorted live); members see queued or their claimed lines
    const isAdmin = decoded.role === 'admin';
    let lines;
    if (isAdmin) {
      // admins should see staged (live sorted) and duplicates
      lines = await NumberLine.find({
        teamId: decoded.teamId,
        status: { $in: ['staged', 'duplicate'] },
      })
        .populate("claimedBy", "name email")
        .sort({ createdAt: -1 });
    } else {
      lines = await NumberLine.find({
        teamId: decoded.teamId,
        $or: [{ status: "queued" }, { status: "claimed", claimedBy: decoded.id }],
      })
        .populate("claimedBy", "name email")
        .sort({ createdAt: -1 });
    }

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

    if (!decoded.teamId) return res.status(400).json({ error: 'Team ID missing in token' });

    const { content } = req.body;
    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: "Content is required" });
    }

    const sanitizedContent = content.trim();

    // Check if this content already exists in distributed lines
    const distributedDoc = await NumberLine.findOne({ teamId: decoded.teamId, status: 'distributed', content: { $regex: `^${sanitizedContent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
    if (distributedDoc) {
      // already present in distributed - save as duplicate record
      const existingLines = await NumberLine.find({ teamId: decoded.teamId });
      const lineNumber = existingLines.length + 1;
      const dup = new NumberLine({
        teamId: decoded.teamId,
        content: sanitizedContent,
        lineNumber,
        status: 'duplicate',
      });
      await dup.save();
      return res.json({ line: null, duplicate: dup });
    }

    const existingLines = await NumberLine.find({ teamId: decoded.teamId });
    const lineNumber = existingLines.length + 1;

    const line = new NumberLine({
      teamId: decoded.teamId,
      content: sanitizedContent,
      lineNumber,
      status: "staged",
    });

    await line.save();

    // emit real-time update to team room if io present
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`team_${decoded.teamId}`).emit("lines_added", { lines: [line] });
      }
    } catch (e) {
      console.error('Emit lines_added failed', e);
    }

    res.json(line);
  } catch (error) {
    console.error("Create line error:", (error as Error).message || error);
    res.status(500).json({ error: ((error as Error).message || "Failed to create line") });
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

    if (!decoded.teamId) return res.status(400).json({ error: 'Team ID missing in token' });

    const { contents } = req.body;
    if (!Array.isArray(contents) || contents.length === 0) {
      return res.status(400).json({ error: "Contents array is required" });
    }

    // sanitize and filter empty contents
    const sanitized = contents
      .map((c: any) => (typeof c === 'string' ? c.trim() : String(c)))
      .filter((c: string) => c.length > 0);

    if (sanitized.length === 0) return res.status(400).json({ error: 'No valid contents provided' });

    // remove any contents already present in distributed lines for this team
    const distributedDocs = await NumberLine.find({ teamId: decoded.teamId, status: 'distributed' });
    const distributedSet = new Set(distributedDocs.map((d) => (d.content || '').toString().trim().toLowerCase()));

    const filtered = sanitized.filter((s: string) => !distributedSet.has(s.toString().trim().toLowerCase()));

    // compute skipped (duplicates removed because present in distributed)
    const skipped = sanitized.filter((s: string) => distributedSet.has(s.toString().trim().toLowerCase()));

    const existingLines = await NumberLine.find({ teamId: decoded.teamId });
    const startLineNumber = existingLines.length + 1;

    const newLines = filtered.map((content: string, index: number) => ({
      teamId: decoded.teamId,
      content,
      lineNumber: startLineNumber + index,
      status: "staged" as const,
    }));

    // prepare duplicates to save
    let duplicateDocs: any[] = [];
    if (skipped.length > 0) {
      duplicateDocs = skipped.map((content: string, index: number) => ({
        teamId: decoded.teamId,
        content,
        lineNumber: startLineNumber + newLines.length + index,
        status: "duplicate" as const,
      }));
    }

    // Use ordered:false so if any document fails, others still insert
    const createdLines = newLines.length > 0 ? await NumberLine.insertMany(newLines, { ordered: false }) : [];
    const createdDuplicates = duplicateDocs.length > 0 ? await NumberLine.insertMany(duplicateDocs, { ordered: false }) : [];

    // emit real-time updates
    try {
      const io = req.app.get("io");
      if (io) {
        if (createdLines.length > 0) {
          io.to(`team_${decoded.teamId}`).emit("lines_added", { lines: createdLines });
        }
        if (createdDuplicates.length > 0) {
          io.to(`team_${decoded.teamId}`).emit("duplicates_added", { duplicates: createdDuplicates });
        }
      }
    } catch (e) {
      console.error('Emit lines/duplicates failed', e);
    }

    res.json({ lines: createdLines, duplicates: createdDuplicates });
  } catch (error) {
    console.error("Create lines error:", (error as Error).message || error);
    // Return the error message for debugging (safe in dev)
    res.status(500).json({ error: ((error as Error).message || "Failed to create lines") });
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

    // emit update
    try {
      const io = req.app.get("io");
      if (io) {
        io.to(`team_${line.teamId}`).emit("line_deleted", { id: line._id });
      }
    } catch (e) {
      console.error('Emit line_deleted failed', e);
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

export const handleClearDistributor: RequestHandler = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const decoded = verifyToken(token);
    if (!decoded) return res.status(401).json({ error: "Invalid token" });

    // Only admins can clear distributor assignments
    if (decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const result = await NumberLine.deleteMany({ teamId: decoded.teamId, status: 'distributed' });
    res.json({ message: 'Cleared distributor assignments', deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Clear distributor error:', error);
    res.status(500).json({ error: 'Failed to clear distributor assignments' });
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

    // Determine how many lines to claim from team settings
    const claimSettings = await require('../db').ClaimSettings.findOne({ teamId: decoded.teamId });
    const linesToClaim = (claimSettings && typeof claimSettings.claimLineCount === 'number') ? claimSettings.claimLineCount : 1;

    // Fetch the next queued lines for this team (ordered by createdAt ascending to claim oldest first)
    const queuedLines = await NumberLine.find({ teamId: decoded.teamId, status: 'queued' })
      .sort({ createdAt: 1 })
      .limit(linesToClaim)
      .select('_id');

    if (!queuedLines || queuedLines.length === 0) {
      return res.status(409).json({ error: 'No queued lines available to claim' });
    }

    const ids = queuedLines.map((l: any) => l._id);

    // Attempt to atomically claim the selected lines (only those still queued and unclaimed will be updated)
    const updateResult = await NumberLine.updateMany(
      { _id: { $in: ids }, teamId: decoded.teamId, status: 'queued', claimedBy: null },
      { $set: { status: 'claimed', claimedBy: decoded.id, claimedAt: new Date() } },
    );

    if (updateResult.modifiedCount === 0) {
      // Nothing was claimed (race condition) - inform client to retry
      return res.status(409).json({ error: 'Failed to claim lines, they may have been claimed by others' });
    }

    // Return the lines that were successfully claimed by this user
    const claimedLines = await NumberLine.find({ _id: { $in: ids }, claimedBy: decoded.id });

    res.json({ lines: claimedLines });
  } catch (error) {
    console.error('Claim line error:', error);
    res.status(500).json({ error: 'Failed to claim line(s)' });
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
