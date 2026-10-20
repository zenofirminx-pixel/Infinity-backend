// Infinity Backend — Feedback API
// Compatible avec "type": "module"

const RESEND_API_URL = "https://api.resend.com/emails";
const FEEDBACK_TO = "firminphinees@gmail.com";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");

    return res.status(405).json({
      success: false,
      error: "Méthode non autorisée."
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM;

  if (!apiKey || !from) {
    console.error("Configuration Resend manquante.");

    return res.status(500).json({
      success: false,
      error: "Le service e-mail n'est pas configuré."
    });
  }

  try {
    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body)
        : req.body;

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        error: "Données invalides."
      });
    }

    const clean = (value, max = 3000) =>
      typeof value === "string"
        ? value.trim().slice(0, max)
        : "";

    let subject;
    let details;

    if (body.type === "bug") {
      const description = clean(
        body.description || body.message,
        5000
      );

      if (!description) {
        return res.status(400).json({
          success: false,
          error: "La description du bug est obligatoire."
        });
      }

      subject = "[Infinity] Signalement de bug";

      details = [
        "Nouveau signalement de bug Infinity",
        "",
        "Description :",
        description,
        "",
        "Compte : " + (clean(body.account, 200) || "Non renseigné"),
        "Page : " + (clean(body.page, 300) || "Non renseignée"),
        "Version : " + (clean(body.appVersion, 100) || "Non renseignée"),
        "Date : " + (clean(body.date, 100) || "Non renseignée")
      ].join("\n");
    } else if (body.type === "rating") {
      if (body.rating !== "up" && body.rating !== "down") {
        return res.status(400).json({
          success: false,
          error: "Évaluation invalide."
        });
      }

      subject =
        body.rating === "up"
          ? "[Infinity] Évaluation positive"
          : "[Infinity] Évaluation négative";

      details = [
        "Nouvelle évaluation d'une réponse Infinity",
        "",
        "Évaluation : " +
          (body.rating === "up" ? "👍 Positive" : "👎 Négative"),
        "",
        "Question :",
        clean(body.question, 2000) || "Non renseignée",
        "",
        "Réponse évaluée :",
        clean(body.response || body.answer, 5000) || "Non renseignée",
        "",
        "Compte : " + (clean(body.account, 200) || "Non renseigné"),
        "Date : " + (clean(body.date, 100) || "Non renseignée")
      ].join("\n");
    } else {
      return res.status(400).json({
        success: false,
        error: "Type de feedback inconnu."
      });
    }

    const emailResponse = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [FEEDBACK_TO],
        subject,
        text: details
      })
    });

    const result = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error(
        "Erreur Resend :",
        emailResponse.status,
        result
      );

      return res.status(502).json({
        success: false,
        error: "Resend n'a pas pu accepter l'e-mail."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Ton retour a été envoyé.",
      id: result.id
    });
  } catch (error) {
    console.error("Erreur Feedback :", error);

    return res.status(500).json({
      success: false,
      error: "Erreur interne lors du traitement du retour."
    });
  }
}