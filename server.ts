import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Simple JSON-file persistence helpers for multi-device sync
  const DATA_DIR = path.join(process.cwd(), "data");
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
  const REQUESTS_FILE = path.join(DATA_DIR, "requests.json");
  const PERSONAS_FILE = path.join(DATA_DIR, "personas.json");

  function readJSONFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
      }
    } catch (err) {
      console.error(`Error reading ${filePath}:`, err);
    }
    return null;
  }

  function writeJSONFile(filePath: string, data: any) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      console.error(`Error writing ${filePath}:`, err);
    }
  }

  // Get current shared state
  app.get("/api/state", (req, res) => {
    const bookings = readJSONFile(BOOKINGS_FILE);
    const requests = readJSONFile(REQUESTS_FILE);
    const personas = readJSONFile(PERSONAS_FILE);
    res.json({ bookings, requests, personas });
  });

  // Save bookings
  app.post("/api/state/bookings", (req, res) => {
    const { bookings } = req.body;
    writeJSONFile(BOOKINGS_FILE, bookings);
    res.json({ success: true });
  });

  // Save requests
  app.post("/api/state/requests", (req, res) => {
    const { requests } = req.body;
    writeJSONFile(REQUESTS_FILE, requests);
    res.json({ success: true });
  });

  // Save personas
  app.post("/api/state/personas", (req, res) => {
    const { personas } = req.body;
    writeJSONFile(PERSONAS_FILE, personas);
    res.json({ success: true });
  });

  // API Route to send email
  app.post("/api/notify", async (req, res) => {
    try {
      const { email, name, room, date, slots, status } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      console.log(`[Email Service] Preparing notification for ${email} (${name}) - Status: ${status}`);

      // Setup standard transporter with environment variables
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465", // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });

      let subject = "";
      let htmlContent = "";

      const slotString = slots && Array.isArray(slots) ? slots.join(", ") : slots;

      if (status === "Pending") {
        subject = `Booking Request Submitted: ${room}`;
        htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; color: #334155;">
            <h2 style="color: #475569; border-bottom: 2px solid #ef4444; padding-bottom: 10px; font-weight: 800;">👋 Request Received</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your incubator space booking request has been submitted and is currently <strong>awaiting approval</strong> from the Administrator.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <h3 style="color: #1e293b; margin-bottom: 5px;">Reservation Details:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold; width: 120px;">Space:</td><td style="padding: 8px;">${room}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${date}</td></tr>
              <tr style="background-color: #f8fafc;"><td style="padding: 8px; font-weight: bold;">Time Slot(s):</td><td style="padding: 8px;">${slotString}</td></tr>
            </table>
            <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">NIET Incubator Booking Portal. Please do not reply directly to this email.</p>
          </div>
        `;
      } else if (status === "Approved") {
        subject = `🎉 Booking APPROVED: ${room}`;
        htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; color: #334155;">
            <h2 style="color: #15803d; border-bottom: 2px solid #16a34a; padding-bottom: 10px; font-weight: 800;">🎉 Booking Approved!</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Great news! Your booking request for the incubator space has been <strong>Approved</strong> by the Superuser Administrator.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <h3 style="color: #1e293b; margin-bottom: 5px;">Reservation Details:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="background-color: #f0fdf4;"><td style="padding: 8px; font-weight: bold; width: 120px;">Space:</td><td style="padding: 8px; color: #166534;">${room}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${date}</td></tr>
              <tr style="background-color: #f0fdf4;"><td style="padding: 8px; font-weight: bold;">Time Slot(s):</td><td style="padding: 8px;">${slotString}</td></tr>
            </table>
            <p style="margin-top: 20px;">Your spot is officially reserved. Please make sure to arrive on time and adhere to the incubator space guidelines.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">NIET Incubator Booking Portal. Please do not reply directly to this email.</p>
          </div>
        `;
      } else if (status === "Rejected") {
        subject = `Booking Request Denied: ${room}`;
        htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; color: #334155;">
            <h2 style="color: #b91c1c; border-bottom: 2px solid #dc2626; padding-bottom: 10px; font-weight: 800;">❌ Booking Request Denied</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>Unfortunately, your booking request for the incubator space has been <strong>Rejected</strong> by the Administrator. This might be due to scheduling conflicts, capacity constraints, or resource prioritization.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <h3 style="color: #1e293b; margin-bottom: 5px;">Requested Reservation Details:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="background-color: #fef2f2;"><td style="padding: 8px; font-weight: bold; width: 120px;">Space:</td><td style="padding: 8px; color: #991b1b;">${room}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${date}</td></tr>
              <tr style="background-color: #fef2f2;"><td style="padding: 8px; font-weight: bold;">Time Slot(s):</td><td style="padding: 8px;">${slotString}</td></tr>
            </table>
            <p style="margin-top: 20px;">We welcome you to submit a request for an alternate slot or day on the Booker Portal.</p>
            <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">NIET Incubator Booking Portal. Please do not reply directly to this email.</p>
          </div>
        `;
      } else if (status === "Queried") {
        subject = `ℹ️ Additional Details Requested: ${room}`;
        htmlContent = `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px; margin: 0 auto; color: #334155;">
            <h2 style="color: #6b21a8; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; font-weight: 800;">ℹ️ Clarification / Details Requested</h2>
            <p>Hi <strong>${name}</strong>,</p>
            <p>The Superuser Administrator is reviewing your booking request for the incubator space and has requested additional details or clarification regarding your meeting/purpose.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <h3 style="color: #1e293b; margin-bottom: 5px;">Reservation Under Review:</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr style="background-color: #f3e8ff;"><td style="padding: 8px; font-weight: bold; width: 120px;">Space:</td><td style="padding: 8px; color: #6b21a8;">${room}</td></tr>
              <tr><td style="padding: 8px; font-weight: bold;">Date:</td><td style="padding: 8px;">${date}</td></tr>
              <tr style="background-color: #f3e8ff;"><td style="padding: 8px; font-weight: bold;">Time Slot(s):</td><td style="padding: 8px;">${slotString}</td></tr>
            </table>
            <p style="margin-top: 20px; padding: 12px; background-color: #fcf6ff; border-left: 4px solid #a855f7; font-style: italic;">
              "Please check back with the incubation desk or the portal's status tracker. If needed, provide details to the TBI administrators directly."
            </p>
            <p style="font-size: 12px; color: #64748b; margin-top: 30px; text-align: center;">NIET Incubator Booking Portal. Please do not reply directly to this email.</p>
          </div>
        `;
      }

      // Check if SMTP is configured
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.warn("[Email Service] SMTP configuration is missing. Logging email to terminal console for simulation:");
        console.log(`========================================`);
        console.log(`To: ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body:`);
        console.log(htmlContent.replace(/<[^>]*>/g, '').trim()); // Strip basic HTML tags for console
        console.log(`========================================`);

        return res.json({ 
          success: true, 
          simulated: true, 
          message: "Email simulated successfully in console. Setup your SMTP credentials in .env to send real emails." 
        });
      }

      await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: subject,
        html: htmlContent
      });

      console.log(`[Email Service] Email sent successfully to ${email}`);
      res.json({ success: true, message: "Notification email sent successfully." });
    } catch (error: any) {
      console.error("[Email Service] Failed to send email:", error);
      res.status(500).json({ error: error.message || "Failed to send email" });
    }
  });

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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
