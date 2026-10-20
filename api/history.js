import db from "./initMemory.js";
import { readSession, getUserId } from "../lib/session.js";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://aurx.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const session = readSession(req);
  const userId = getUserId(session);
  if (!userId) return res.status(401).json({ conversations: [] });
  try {
    const snap = await db.collection("conversations").doc(userId).get();
    const conversations = snap.exists && Array.isArray(snap.data()?.conversations) ? snap.data().conversations : [];
    conversations.sort((a, b) => (b.updatedAt || b.date || 0) - (a.updatedAt || a.date || 0));
    return res.status(200).json({ conversations });
  } catch (err) {
    console.error("History error:", err);
    return res.status(500).json({ error: "Impossible de charger l'historique", conversations: [] });
  }
}
