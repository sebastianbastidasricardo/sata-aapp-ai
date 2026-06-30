import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import chatHandler from "./api/chat";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for chatbot mapped for Vercel Serverless Function compatibility
  app.post("/api/chat", chatHandler);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v4 logic for SPA
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
