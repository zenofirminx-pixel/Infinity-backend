// Infinity Backend — Feedback API
// Reçoit les signalements de bugs et les évaluations 👍/👎
// et les envoie à l'adresse du créateur.

const RESEND_API_URL = "https://api.resend.com/emails";
const FEEDBACK_TO = "firminphinees@gmail.com";

module.exports = async function handler(req, res) {
  // Autoriser les requêtes provenant de l'application Infinity.
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

  // Vérification CORS préalable.
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Seules les requêtes POST sont autorisées.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({
      success: false,
      error: "Méthode non autorisée."
    });
  }

  // Vérifier la configuration du serveur.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM;

  if (!apiKey || !from) {
    console.error(
      "Infinity Feedback : configuration e-mail manquante."
    );

    return res.status(500).json({
      success: false,
      error: "Le service de feedback n'est pas configuré."
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

    const { type } = body;

    // Limiter la taille des informations reçues.
    const limitText = (value, max = 5000) =>
      typeof value === "string"
        ? value.trim().slice(0, max)
        : "";

    let subject;
    let details;

    // ---------------------------------------
    // 1. SIGNALER UN BUG
    // ---------------------------------------
    if (type === "bug") {
      const description = limitText(
        body.description || body.message,
        5000
      );

      if (!description) {
        return res.status(400).json({
          success: false,
          error: "Décris le problème rencontré."
        });
      }

      const account = limitText(body.account, 200);
      const page = limitText(body.page, 300);
      const date = limitText(body.date, 100);
      const appVersion = limitText(body.appVersion, 100);

      subject = "[Infinity] Nouveau signalement de bug";

      details = [
        "Un utilisateur a signalé un problème dans Infinity.",
        "",
        "Description :",
        description,
        "",
        "Compte : " + (account || "Non renseigné"),
        "Page : " + (page || "Non renseignée"),
        "Date déclarée : " + (date || "Non renseignée"),
        "Version : " + (appVersion || "Non renseignée")
      ].join("\n");
    }

    // ---------------------------------------
    // 2. ÉVALUATION D'UNE RÉPONSE DE L'IA
    // ---------------------------------------
    else if (type === "rating") {
      const rating = body.rating;

      if (rating !== "up" && rating !== "down") {
        return res.status(400).json({
          success: false,
          error: "Évaluation invalide."
        });
      }

      const response = limitText(
        body.response || body.answer,
        5000
      );

      const question = limitText(body.question, 2000);
      const account = limitText(body.account, 200);
      const date = limitText(body.date, 100);

      subject =
        rating === "up"
          ? "[Infinity] Évaluation positive 👍"
          : "[Infinity] Évaluation négative 👎";

      details = [
        "Une réponse de l'IA Infinity a été évaluée.",
        "",
        "Évaluation : " +
          (rating === "up" ? "👍 Positive" : "👎 Négative"),
        "",
        "Question de l'utilisateur :",
        question || "Non renseignée",
        "",
        "Réponse évaluée :",
        response || "Non renseignée",
        "",
        "Compte : " + (account || "Non renseigné"),
        "Date déclarée : " + (date || "Non renseignée")
      ].join("\n");
    }

    // ---------------------------------------
    // 3. TYPE INCONNU
    // ---------------------------------------
    else {
      return res.status(400).json({
        success: false,
        error: "Type de feedback inconnu."
      });
    }

    // ---------------------------------------
    // 4. ENVOI DE L'E-MAIL AVEC RESEND
    // ---------------------------------------
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
        "Infinity Feedback : échec de l'envoi.",
        emailResponse.status,
        result
      );

      return res.status(502).json({
        success: false,
        error: "L'e-mail n'a pas pu être envoyé."
      });
    }

    console.log(
      "Infinity Feedback : e-mail envoyé.",
      type
    );

    return res.status(200).json({
      success: true,
      message: "Ton retour a été envoyé avec succès."
    });

  } catch (error) {
    console.error(
      "Infinity Feedback : erreur interne.",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: "Une erreur interne est survenue."
    });
  }
};