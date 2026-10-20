import db from "./initMemory.js";
import { readSession, getUserId } from "../lib/session.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "https://aurx.vercel.app");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const userId = getUserId(readSession(req));
  if (!userId) return res.status(401).json({ error: "Connexion requise" });
  try {
    const convRef = db.collection("conversations").doc(userId);
    const messagesRef = db.collection("users").doc(userId).collection("messages");
    const snapshot = await messagesRef.get();
    // Firestore batch limite à 500 opérations : traiter par groupes.
    let deletedMessages = 0;
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = db.batch();
      snapshot.docs.slice(i, i + 450).forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      deletedMessages += snapshot.docs.slice(i, i + 450).length;
    }
    await convRef.set({ conversations: [] }, { merge: true });
    return res.status(200).json({ ok: true, deletedConversations: true, deletedMessages });
  } catch (err) {
    console.error("Delete all error:", err);
    return res.status(500).json({ error: "Impossible de supprimer les conversations" });
  }
}
