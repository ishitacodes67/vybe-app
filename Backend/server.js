// Fix for Windows Node.js SRV DNS issue
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db");

const authRoutes = require("./Routes/authRoutes");
const userRoutes = require("./Routes/userRoutes");
const eventRoutes = require("./Routes/eventRoutes");
const registrationRoutes = require("./Routes/registrationRoutes");
const organizerRoutes = require("./Routes/organizerRoutes");
const authorityRoutes = require("./Routes/authorityRoutes");
const feedbackRoutes = require("./Routes/feedbackRoutes");
const notificationRoutes = require("./Routes/notificationRoutes");
const chatRoutes = require("./Routes/chatRoutes");                     // ← ADDED

const app = express();

const allowedOrigins = (process.env.CLIENT_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/registrations", registrationRoutes);
app.use("/api/organizer", organizerRoutes);
app.use("/api/authority", authorityRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/chat", chatRoutes);                                       // ← ADDED

// Catch-all error handler - keeps stack traces out of API responses
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`VYBE backend running on port ${PORT}`));
});