import nodemailer from "nodemailer";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Méthode non autorisée."
    });
  }

  try {
    const { type, description, message, rating, question, response, answer } =
      req.body || {};

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.error("Configuration Gmail manquante.");

      return res.status(500).json({
        success: false,
        error: "Le service d'envoi n'est pas configuré."
      });
    }

    let subject;
    let text;

    if (type === "bug") {
      const bugDescription = String(description || message || "").trim();

      if (!bugDescription || bugDescription.length > 5000) {
        return res.status(400).json({
          success: false,
          error: "Description du bug invalide."
        });
      }

      subject = "🐛 Signalement de bug — Infinity";

      text = [
        "Nouveau signalement de bug sur Infinity",
        "",
        "Description :",
        bugDescription,
        "",
        `Date : ${new Date().toISOString()}`
      ].join("\n");
    } else if (type === "rating") {
      if (rating !== "up" && rating !== "down") {
        return res.status(400).json({
          success: false,
          error: "Évaluation invalide."
        });
      }

      subject =
        rating === "up"
          ? "👍 Évaluation positive — Infinity"
          : "👎 Évaluation négative — Infinity";

      text = [
        "Nouvelle évaluation d'une réponse d'Infinity",
        "",
        `Évaluation : ${rating === "up" ? "Positive 👍" : "Négative 👎"}`,
        "",
        `Question : ${String(question || "Non fournie").slice(0, 3000)}`,
        "",
        `Réponse de l'IA : ${String(response || answer || "Non fournie").slice(0, 8000)}`,
        "",
        `Date : ${new Date().toISOString()}`
      ].join("\n");
    } else {
      return res.status(400).json({
        success: false,
        error: "Type de retour non reconnu."
      });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    await transporter.sendMail({
      from: `"Infinity" <${gmailUser}>`,
      to: "firminphinees@gmail.com",
      subject,
      text
    });

    return res.status(200).json({
      success: true,
      message: "Retour envoyé avec succès."
    });
  } catch (error) {
    console.error("Erreur d'envoi du feedback :", error.message);

    return res.status(500).json({
      success: false,
      error: "Impossible d'envoyer le retour pour le moment."
    });
  }
}