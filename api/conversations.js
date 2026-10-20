import db from "./initMemory.js";
import { readSession, getUserId } from "../lib/session.js";
import { randomUUID } from "crypto";
import { parse, serialize } from "cookie";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://aurx.vercel.app");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const session = readSession(req);
  let userId = getUserId(session);
  if (!userId) {
    const cookies = parse(req.headers.cookie || "");
    userId = cookies.aurx_guest_id || `guest_${randomUUID()}`;
    if (!cookies.aurx_guest_id) {
      res.setHeader("Set-Cookie", serialize("aurx_guest_id", userId, {
        path: "/", httpOnly: true, secure: true, sameSite: "none", maxAge: 60 * 60 * 24 * 365,
      }));
    }
    return res.status(201).json({ convId: randomUUID(), localOnly: true });
  }
  try {
    const convId = randomUUID();
    const ref = db.collection("conversations").doc(userId);
    const snap = await ref.get();
    const conversations = snap.exists && Array.isArray(snap.data()?.conversations) ? snap.data().conversations : [];
    conversations.unshift({ id: convId, title: "Nouvelle conversation", messages: [], date: Date.now(), updatedAt: Date.now() });
    await ref.set({ conversations }, { merge: true });
    return res.status(201).json({ convId });
  } catch (err) {
    console.error("Create conversation error:", err);
    return res.status(500).json({ error: "Impossible de créer la conversation" });
  }
}
