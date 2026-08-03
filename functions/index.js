const { initializeApp } = require("firebase-admin/app");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const nodemailer = require("nodemailer");

initializeApp();

const smtpPassword = defineSecret("firestore-send-email-SMTP_PASSWORD-q2mo");
const sender = "gboetsch93@gmail.com";

exports.sendWeddingEmail = onDocumentCreated(
  {
    document: "mail/{mailId}",
    region: "us-central1",
    secrets: [smtpPassword],
    retry: false,
  },
  async (event) => {
    const snapshot = event.data;
    const data = snapshot?.data();
    const recipients = Array.isArray(data?.to) ? data.to : [data?.to].filter(Boolean);
    const message = data?.message;

    if (!snapshot || recipients.length === 0 || !message?.subject || (!message?.text && !message?.html)) {
      console.warn("Documento de correo incompleto", event.params.mailId);
      return;
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: sender,
        pass: smtpPassword.value(),
      },
    });

    try {
      const result = await transporter.sendMail({
        from: `"María y Guido" <${sender}>`,
        replyTo: sender,
        to: recipients.join(", "),
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      await snapshot.ref.update({
        delivery: {
          state: "SUCCESS",
          message_id: result.messageId || "",
          attempts: 1,
        },
        delivered_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("No se pudo enviar el correo", error);
      await snapshot.ref.update({
        delivery: {
          state: "ERROR",
          error: String(error?.message || error).slice(0, 500),
          attempts: 1,
        },
        delivery_failed_at: new Date().toISOString(),
      });
      throw error;
    }
  },
);
