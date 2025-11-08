import { createServerWithSocket } from "./index";

const { app, httpServer } = createServerWithSocket();
const port = process.env.PORT || 3000;

httpServer.listen(port, () => {
  console.log(`🚀 Line-Link API server running on port ${port}`);
  console.log(`🔧 API: http://localhost:${port}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 Received SIGTERM, shutting down gracefully");
  httpServer.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("🛑 Received SIGINT, shutting down gracefully");
  httpServer.close(() => process.exit(0));
});
