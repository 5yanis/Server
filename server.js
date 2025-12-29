// index.js
import express from "express";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Config (zet dit in .env)
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;        // Web OAuth client ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;  // bv https://jouw-backend.onrender.com/auth/google/callback

// Simpele in-memory opslag van tokens (voor demo)
let tokens = {};

// Endpoint om auth code van Android app te ontvangen
app.post("/auth/google", async (req, res) => {
  const { code, userId } = req.body;
  if (!code || !userId) return res.status(400).send("code & userId required");

  try {
    // Wissel auth code om voor tokens
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

    // Sla refresh token op voor deze gebruiker
    tokens[userId] = tokenData;

    res.json({ message: "Tokens opgeslagen", tokenData });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error exchanging code");
  }
});

// Endpoint om Calendar events op te halen
app.get("/calendar/events", async (req, res) => {
  const { userId } = req.query;
  if (!userId || !tokens[userId]) return res.status(400).send("User not logged in");

  try {
    const accessToken = tokens[userId].access_token;

    const calendarResp = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    const events = await calendarResp.json();
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching calendar events");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server draait op poort ${PORT}`));
