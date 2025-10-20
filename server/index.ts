import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { handleDemo } from "./routes/demo";
import {
  handleSignup,
  handleLogin,
  handleCreateMember,
  handleGetClaimSettings,
  handleSaveClaimSettings,
  handleGetMembers,
  handleGetDistributorSettings,
  handleSaveDistributorSettings,
} from "./routes/auth";
import {
  handleGetContacts,
  handleCreateContact,
  handleUpdateContact,
  handleDeleteContact,
} from "./routes/contacts";
import {
  handleGetLines,
  handleCreateLine,
  handleCreateLines,
  handleDeleteLine,
  handleMoveToQueue,
  handleMoveToDistributor,
  handleGetQueuedLines,
  handleClaimLine,
} from "./routes/numbers";
import { connectDB } from "./db";

export function createServer() {
  const app = express();

  // Connect to MongoDB
  connectDB().catch(console.error);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Auth routes
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);
  app.post("/api/auth/create-member", handleCreateMember);
  app.get("/api/auth/claim-settings", handleGetClaimSettings);
  app.post("/api/auth/claim-settings", handleSaveClaimSettings);
  app.get("/api/auth/members", handleGetMembers);
  app.get("/api/auth/distributor-settings", handleGetDistributorSettings);
  app.post("/api/auth/distributor-settings", handleSaveDistributorSettings);

  // Numbers routes
  app.get("/api/numbers/lines", handleGetLines);
  app.post("/api/numbers/line", handleCreateLine);
  app.post("/api/numbers/lines", handleCreateLines);
  app.delete("/api/numbers/line/:id", handleDeleteLine);
  app.post("/api/numbers/move-to-queue", handleMoveToQueue);
  app.post("/api/numbers/move-to-distributor", handleMoveToDistributor);
  app.get("/api/numbers/queued", handleGetQueuedLines);
  app.post("/api/numbers/claim", handleClaimLine);

  // Contacts routes
  app.get("/api/contacts", handleGetContacts);
  app.post("/api/contacts", handleCreateContact);
  app.put("/api/contacts/:id", handleUpdateContact);
  app.delete("/api/contacts/:id", handleDeleteContact);

  return app;
}

export function createServerWithSocket() {
  const app = createServer();
  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // WebSocket events
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_team", (teamId: string) => {
      socket.join(`team_${teamId}`);
    });

    socket.on("claim_update", (data) => {
      io.to(`team_${data.teamId}`).emit("claim_indicator", {
        ready: data.ready,
        cooldownRemaining: data.cooldownRemaining,
      });
    });

    socket.on("distributor_update", (data) => {
      io.to(`team_${data.teamId}`).emit("distributor_indicator", {
        active: data.active,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return { app, httpServer, io };
}
