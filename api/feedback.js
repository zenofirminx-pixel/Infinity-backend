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
    const {
      type,
      description,
      message,
      rating
    } = req.body || {};

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
    let emailText;

    // ÉVALUATIONS DE L'IA
    if (type === "rating") {
      if (rating === "up") {
        subject = "👍 Infinity APK — Réponse correcte";

        emailText =
          "Un utilisateur trouve que la réponse d'Infinity est correcte.\n\n" +
          "Source : application Infinity (APK).";
      } else if (rating === "down") {
        subject = "👎 Infinity APK — Réponse signalée";

        emailText =
          "Un utilisateur a trouvé des erreurs dans les réponses d'Infinity.\n\n" +
          "Source : application Infinity (APK).";
      } else {
        return res.status(400).json({
          success: false,
          error: "Évaluation invalide."
        });
      }
    }

    // SIGNALEMENTS DE BUGS
    else if (type === "bug") {
      const bugDescription = String(
        description || message || ""
      ).trim();

      if (!bugDescription || bugDescription.length > 5000) {
        return res.status(400).json({
          success: false,
          error: "La description du bug est invalide."
        });
      }

      subject = "🐛 Infinity APK — Nouveau signalement de bug";

      emailText =
        "Un utilisateur a signalé un problème dans Infinity.\n\n" +
        "Source : application Infinity (APK).\n\n" +
        "Description du problème :\n" +
        bugDescription +
        "\n\nDate : " +
        new Date().toISOString();
    }

    // TYPE INCONNU
    else {
      return res.status(400).json({
        success: false,
        error: "Type de retour non reconnu."
      });
    }

    // ENVOI DE L'E-MAIL
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPassword
      }
    });

    await transporter.sendMail({
      from: {
        name: "Infinity APK",
        address: gmailUser
      },
      to: "firminphinees@gmail.com",
      subject,
      text: emailText
    });

    console.log("Retour Infinity envoyé :", type);

    return res.status(200).json({
      success: true,
      message: "Retour envoyé avec succès."
    });

  } catch (error) {
    console.error(
      "Erreur d'envoi Infinity :",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: "L'envoi a échoué. Réessaie plus tard."
    });
  }
}