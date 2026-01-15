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

    const { status } = req.query as any;

    if (status === "sorted") {
      const lines = await NumberLine.find({
        teamId: decoded.teamId,
        status: "sorted",
      }).sort({ createdAt: -1 });
      return res.json({ lines });
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

    const trimmedContent = String(content).trim();
    if (!trimmedContent) {
      return res.status(400).json({ error: "Content is required" });
    }

    const status = req.body.status === "sorted" ? "sorted" : "queued";

    // If creating a sorted line, check for existing lines with same content across all statuses
    if (status === "sorted") {
      const existing = await NumberLine.findOne({
        teamId: decoded.teamId,
        content: trimmedContent,
      });
      if (existing) {
        // If it's already sorted, don't create duplicate
        if (existing.status === "sorted") {
          return res.status(409).json({
            error: "Line already exists in sorted lines",
            line: existing,
          });
        }

        // If it's queued or distributed, do NOT move it to sorted. Inform caller it's skipped.
        return res.status(409).json({
          error: "Line exists in another list",
          skipped: [
            {
              _id: existing._id,
              content: existing.content,
              status: existing.status,
            },
          ],
        });
      }
    }

    // Create new line
    const existingLines = await NumberLine.find({ teamId: decoded.teamId });
    const lineNumber = existingLines.length + 1;

    const line = new NumberLine({
      teamId: decoded.teamId,
      content: trimmedContent,
      lineNumber,
      status,
    });

    await line.save();
    // emit websocket event to team room
    try {
      const io = (req as any).app?.get("io");
      if (io) {
        if (status === "sorted")
          io.to(`team_${decoded.teamId}`).emit("sorted_lines_changed", {
            action: "created",
            line,
          });
        else
          io.to(`team_${decoded.teamId}`).emit("queued_lines_changed", {
            action: "created",
            line,
          });
        io.to(`team_${decoded.teamId}`).emit("stats_updated");
      }
    } catch (e) {
      console.error("Emit create line error", e);
    }
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

    const status = req.body.status === "sorted" ? "sorted" : "queued";

    // Normalize and deduplicate inputs
    const normalized = Array.from(
      new Set(
        contents
          .map((c: any) => String(c || "").trim())
          .filter((c: any) => c.length > 0),
      ),
    );
    if (normalized.length === 0)
      return res.status(400).json({ error: "Contents array is required" });

    // Find existing lines that match any of the input contents
    const existingDocs = await NumberLine.find({
      teamId: decoded.teamId,
      content: { $in: normalized },
    });
    const existingMap: Record<string, any> = {};
    existingDocs.forEach((d: any) => (existingMap[d.content] = d));

    // Prepare arrays for creating new docs and skipped existing ones
    const toCreate: any[] = [];
    const skipped: any[] = [];
    const nowCount = await NumberLine.countDocuments({
      teamId: decoded.teamId,
    });
    let nextLineNumber = nowCount + 1;

    for (const content of normalized) {
      const existing = existingMap[content];
      if (existing) {
        // skip creating duplicates; report as skipped
        skipped.push({
          _id: existing._id,
          content: existing.content,
          status: existing.status,
        });
      } else {
        toCreate.push({
          teamId: decoded.teamId,
          content,
          lineNumber: nextLineNumber++,
          status: status as const,
        });
      }
    }

    let createdLines: any[] = [];
    if (toCreate.length > 0) {
      createdLines = await NumberLine.insertMany(toCreate);
    }

    // Emit socket events based on what changed
    try {
      const io = (req as any).app?.get("io");
      if (io) {
        if (status === "sorted") {
          if (createdLines.length > 0)
            io.to(`team_${decoded.teamId}`).emit("sorted_lines_changed", {
              action: "created_bulk",
              lines: createdLines,
            });
        } else {
          if (createdLines.length > 0)
            io.to(`team_${decoded.teamId}`).emit("queued_lines_changed", {
              action: "created_bulk",
              lines: createdLines,
            });
        }
        io.to(`team_${decoded.teamId}`).emit("stats_updated");
      }
    } catch (e) {
      console.error("Emit create lines error", e);
    }

    // Return created lines and any skipped existing items for client to update UI
    res.json({ lines: createdLines, skipped });
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

    try {
      const io = (req as any).app?.get("io");
      if (io) {
        if (line.status === "sorted")
          io.to(`team_${decoded.teamId}`).emit("sorted_lines_changed", {
            action: "deleted",
            id,
          });
        else if (line.status === "queued")
          io.to(`team_${decoded.teamId}`).emit("queued_lines_changed", {
            action: "deleted",
            id,
          });
        io.to(`team_${decoded.teamId}`).emit("stats_updated");
      }
    } catch (e) {
      console.error("Emit delete line error", e);
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

    // fetch previous statuses to detect if any were 'sorted'
    const prev = await NumberLine.find({
      _id: { $in: lineIds },
      teamId: decoded.teamId,
    }).select("status");

    const updatedLines = await NumberLine.updateMany(
      { _id: { $in: lineIds }, teamId: decoded.teamId },
      { status: "queued", claimedBy: null },
    );

    try {
      const io = (req as any).app?.get("io");
      if (io) {
        io.to(`team_${decoded.teamId}`).emit("queued_lines_changed", {
          action: "moved_to_queue",
          ids: lineIds,
        });
        io.to(`team_${decoded.teamId}`).emit("stats_updated");
        if (prev.some((p: any) => p.status === "sorted")) {
          io.to(`team_${decoded.teamId}`).emit("sorted_lines_changed", {
            action: "moved_to_queue",
            ids: lineIds,
          });
        }
      }
    } catch (e) {
      console.error("Emit move to queue error", e);
    }

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

    // fetch previous statuses to detect if any were 'sorted'
    const prev = await NumberLine.find({
      _id: { $in: lineIds },
      teamId: decoded.teamId,
    }).select("status");

    const updatedLines = await NumberLine.updateMany(
      { _id: { $in: lineIds }, teamId: decoded.teamId },
      {
        status: "distributed",
        distributedTo: [],
        claimedBy: null,
        claimedAt: null,
      },
    );

    try {
      const io = (req as any).app?.get("io");
      if (io) {
        io.to(`team_${decoded.teamId}`).emit("queued_lines_changed", {
          action: "moved_to_distributor",
          ids: lineIds,
        });
        io.to(`team_${decoded.teamId}`).emit("stats_updated");

        // Fetch the moved lines to include in distributed_lines event
        const movedDocs = await NumberLine.find({
          _id: { $in: lineIds },
          teamId: decoded.teamId,
        });
        const distributedPayload = movedDocs
          .filter((d: any) => d.status === "distributed")
          .map((l: any) => ({
            id: l._id,
            lineNumber: l.lineNumber,
            content: l.content,
            createdAt: l.createdAt,
            distributedTo: l.distributedTo || [],
            status: l.status,
          }));

        if (distributedPayload.length > 0) {
          io.to(`team_${decoded.teamId}`).emit("distributed_lines", {
            lines: distributedPayload,
          });
        }

        if (prev.some((p: any) => p.status === "sorted")) {
          io.to(`team_${decoded.teamId}`).emit("sorted_lines_changed", {
            action: "moved_to_distributor",
            ids: lineIds,
          });
        }
      }
    } catch (e) {
      console.error("Emit move to distributor error", e);
    }

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

    // Determine how many lines to claim from team settings
    const claimSettings = await require("../db").ClaimSettings.findOne({
      teamId: decoded.teamId,
    });
    const linesToClaim =
      claimSettings && typeof claimSettings.claimLineCount === "number"
        ? claimSettings.claimLineCount
        : 1;

    // Fetch the next queued lines for this team (ordered by createdAt ascending to claim oldest first)
    const queuedLines = await NumberLine.find({
      teamId: decoded.teamId,
      status: "queued",
    })
      .sort({ createdAt: 1 })
      .limit(linesToClaim)
      .select("_id");

    if (!queuedLines || queuedLines.length === 0) {
      return res
        .status(409)
        .json({ error: "No queued lines available to claim" });
    }

    const ids = queuedLines.map((l: any) => l._id);

    // Attempt to atomically claim the selected lines (only those still queued and unclaimed will be updated)
    const updateResult = await NumberLine.updateMany(
      {
        _id: { $in: ids },
        teamId: decoded.teamId,
        status: "queued",
        claimedBy: null,
      },
      {
        $set: {
          status: "claimed",
          claimedBy: decoded.id,
          claimedAt: new Date(),
        },
      },
    );

    if (updateResult.modifiedCount === 0) {
      // Nothing was claimed (race condition) - inform client to retry
      return res.status(409).json({
        error: "Failed to claim lines, they may have been claimed by others",
      });
    }

    // Return the lines that were successfully claimed by this user
    const claimedLines = await NumberLine.find({
      _id: { $in: ids },
      claimedBy: decoded.id,
    });

    try {
      const io = (req as any).app?.get("io");
      if (io)
        io.to(`team_${decoded.teamId}`).emit("queued_lines_changed", {
          action: "claimed",
          ids,
        });
      if (io) io.to(`team_${decoded.teamId}`).emit("stats_updated");
      // also emit claim indicator for UI (claim button availability)
      if (io)
        io.to(`team_${decoded.teamId}`).emit("claim_indicator", {
          ready: false,
        });
    } catch (e) {
      console.error("Emit claim line error", e);
    }

    res.json({ lines: claimedLines });
  } catch (error) {
    console.error("Claim line error:", error);
    res.status(500).json({ error: "Failed to claim line(s)" });
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
    const queuedLines = await NumberLine.countDocuments({
      teamId,
      status: "queued",
    });

    // Active members count
    const { User } = require("../db");
    const activeMembers = await User.countDocuments({
      teamId,
      role: "member",
      active: true,
    });

    // Claimed today (since midnight)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const claimedToday = await NumberLine.countDocuments({
      teamId,
      status: "claimed",
      claimedAt: { $gte: startOfDay },
    });

    res.json({ totalNumbers, queuedLines, activeMembers, claimedToday });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
};
