// index.js
import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===== Config uit Environment Variables =====
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;        // Web OAuth Client ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;  // https://jouw-app.onrender.com/auth/google/callback

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

// ===== Tijdelijke token opslag (alleen voor test) =====
const tokens = {};

// ===== Ontvang auth code van Android =====
app.post("/auth/google", async (req, res) => {
  const { code, userId } = req.body;

  if (!code || !userId) {
    return res.status(400).json({ error: "code en userId zijn verplicht" });
  }

  try {
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResp.json();

    if (tokenData.error) {
      return res.status(400).json(tokenData);
    }

    tokens[userId] = tokenData;

    res.json({ message: "Google tokens opgeslagen" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

// ===== Haal Google Calendar events op =====
app.get("/calendar/events", async (req, res) => {
  const { userId } = req.query;

  if (!userId || !tokens[userId]) {
    return res.status(401).json({ error: "User niet ingelogd" });
  }

  try {
    const accessToken = tokens[userId].access_token;

    const calendarResp = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const events = await calendarResp.json();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Calendar ophalen mislukt" });
  }
});

// ===== Start server =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server draait op poort ${PORT}`);
});
