const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { HttpsError, onCall } = require("firebase-functions/v2/https");
const { GoogleAuth } = require("google-auth-library");
const nodemailer = require("nodemailer");

initializeApp();

const smtpPassword = defineSecret("firestore-send-email-SMTP_PASSWORD-q2mo");
const sender = "gboetsch93@gmail.com";
const adminUid = "VgGQEYLf2qdcQkMm389U5RDygED3";
const spreadsheetId = "1QuPLy0BrwkzNHFP-LJ-nlKmJ0eQORUEb5kJ55gel0ps";
const sheetsServiceAccount = "258323397237-compute@developer.gserviceaccount.com";
const sheetsAuth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/spreadsheets"] });

const sheetDefinitions = {
  rsvps: {
    title: "Confirmaciones",
    index: 0,
    headers: ["Nombre", "Respuesta", "Cantidad", "Acompañantes", "Comida", "Transporte", "Canción", "Película favorita", "Mensaje", "Email", "Fecha", "ID"],
    row: (id, data) => [
      data.full_name || "",
      data.attendance === "yes" ? "Viene" : "No viene",
      Number(data.guest_count || 1),
      data.guest_names || "",
      data.dietary || "",
      data.transport === "yes" ? "Sí" : "No",
      data.song || "",
      data.favorite_movie || "",
      data.message || "",
      data.email || "",
      data.created_at || "",
      id,
    ],
  },
  rsvp_history: {
    title: "Historial confirmaciones",
    index: 1,
    headers: ["Nombre", "Respuesta anterior", "Cantidad", "Acompañantes", "Comida", "Transporte", "Canción", "Película favorita", "Mensaje", "Email", "Fecha original", "Reemplazada el", "ID confirmación", "ID historial"],
    row: (id, data) => [
      data.full_name || "",
      data.attendance === "yes" ? "Venía" : "No venía",
      Number(data.guest_count || 1),
      data.guest_names || "",
      data.dietary || "",
      data.transport === "yes" ? "Sí" : "No",
      data.song || "",
      data.favorite_movie || "",
      data.message || "",
      data.email || "",
      data.created_at || "",
      data.superseded_at || "",
      data.source_id || "",
      id,
    ],
  },
  gift_confirmations: {
    title: "Regalos",
    index: 2,
    headers: ["Regalo", "De", "Importe", "Dedicatoria", "Email", "Estado", "Fecha", "ID"],
    row: (id, data) => [
      data.gift_name || "",
      data.giver_name || "",
      Number(data.amount || 0),
      data.dedication || "",
      data.email || "",
      data.status === "transfer_declared" ? "Transferencia declarada" : data.status || "",
      data.created_at || "",
      id,
    ],
  },
};

async function sheetsClient() {
  return sheetsAuth.getClient();
}

async function sheetsRequest(path, method = "GET", data) {
  const client = await sheetsClient();
  const response = await client.request({
    url: `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}${path}`,
    method,
    data,
  });
  return response.data;
}

async function spreadsheetSheets() {
  const data = await sheetsRequest("?fields=sheets.properties(sheetId,title,index)");
  return (data.sheets || []).map((sheet) => sheet.properties);
}

async function ensureSheet(definition, preferredIndex) {
  let sheets = await spreadsheetSheets();
  let existing = sheets.find((sheet) => sheet.title === definition.title);
  let created = false;

  if (!existing) {
    const reusable = preferredIndex === 0 && sheets.length === 1
      ? sheets[0]
      : null;
    const request = reusable
      ? {
          updateSheetProperties: {
            properties: { sheetId: reusable.sheetId, title: definition.title },
            fields: "title",
          },
        }
      : { addSheet: { properties: { title: definition.title, index: preferredIndex } } };
    await sheetsRequest(":batchUpdate", "POST", { requests: [request] });
    sheets = await spreadsheetSheets();
    existing = sheets.find((sheet) => sheet.title === definition.title);
    created = true;
  }

  if (!existing) throw new Error(`No se pudo preparar la hoja ${definition.title}`);

  const headerRange = encodeURIComponent(`'${definition.title}'!A1`);
  await sheetsRequest(`/values/${headerRange}?valueInputOption=RAW`, "PUT", {
    range: `'${definition.title}'!A1`,
    majorDimension: "ROWS",
    values: [definition.headers],
  });

  if (created) {
    await sheetsRequest(":batchUpdate", "POST", {
      requests: [
        {
          updateSheetProperties: {
            properties: { sheetId: existing.sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          repeatCell: {
            range: { sheetId: existing.sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: definition.headers.length },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.063, green: 0.063, blue: 0.059 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat)",
          },
        },
        {
          autoResizeDimensions: {
            dimensions: { sheetId: existing.sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: definition.headers.length },
          },
        },
      ],
    });
  }

  return existing;
}

async function syncDocument(collectionName, id, data) {
  const definition = sheetDefinitions[collectionName];
  const sheet = await ensureSheet(definition, definition.index);
  const readRange = encodeURIComponent(`'${definition.title}'!A:Z`);
  const current = await sheetsRequest(`/values/${readRange}`);
  const rows = current.values || [];
  const idColumn = definition.headers.length - 1;
  const existingIndex = rows.findIndex((row, index) => index > 0 && row[idColumn] === id);

  if (!data) {
    if (existingIndex > 0) {
      await sheetsRequest(":batchUpdate", "POST", {
        requests: [{
          deleteDimension: {
            range: { sheetId: sheet.sheetId, dimension: "ROWS", startIndex: existingIndex, endIndex: existingIndex + 1 },
          },
        }],
      });
    }
    return;
  }

  const values = [definition.row(id, data)];
  if (existingIndex > 0) {
    const rowNumber = existingIndex + 1;
    const range = encodeURIComponent(`'${definition.title}'!A${rowNumber}`);
    await sheetsRequest(`/values/${range}?valueInputOption=RAW`, "PUT", {
      range: `'${definition.title}'!A${rowNumber}`,
      majorDimension: "ROWS",
      values,
    });
  } else {
    const range = encodeURIComponent(`'${definition.title}'!A:Z`);
    await sheetsRequest(`/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, "POST", {
      range: `'${definition.title}'!A:Z`,
      majorDimension: "ROWS",
      values,
    });
  }
}

async function rewriteSheet(collectionName, documents) {
  const definition = sheetDefinitions[collectionName];
  await ensureSheet(definition, definition.index);
  await sheetsRequest("/values:batchClear", "POST", { ranges: [`'${definition.title}'!A:Z`] });
  const range = encodeURIComponent(`'${definition.title}'!A1`);
  await sheetsRequest(`/values/${range}?valueInputOption=RAW`, "PUT", {
    range: `'${definition.title}'!A1`,
    majorDimension: "ROWS",
    values: [definition.headers, ...documents.map((document) => definition.row(document.id, document.data()))],
  });
}

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
        // Google muestra las claves de aplicación separadas en bloques.
        // Gmail espera los 16 caracteres sin espacios ni saltos de línea.
        pass: smtpPassword.value().replace(/\s+/g, ""),
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

exports.syncRsvpToGoogleSheets = onDocumentWritten(
  {
    document: "rsvps/{documentId}",
    region: "us-central1",
    serviceAccount: sheetsServiceAccount,
    retry: true,
  },
  async (event) => {
    const before = event.data?.before;
    const after = event.data?.after;

    if (before?.exists && after?.exists) {
      const historyId = `${event.params.documentId}_${event.id}`;
      const historyData = {
        ...before.data(),
        source_id: event.params.documentId,
        superseded_at: new Date().toISOString(),
      };
      await getFirestore().collection("rsvp_history").doc(historyId).set(historyData);
      await syncDocument("rsvp_history", historyId, historyData);
    }

    await syncDocument("rsvps", event.params.documentId, after?.exists ? after.data() : null);
  },
);

exports.syncGiftToGoogleSheets = onDocumentWritten(
  {
    document: "gift_confirmations/{documentId}",
    region: "us-central1",
    serviceAccount: sheetsServiceAccount,
    retry: true,
  },
  async (event) => {
    const snapshot = event.data?.after;
    await syncDocument("gift_confirmations", event.params.documentId, snapshot?.exists ? snapshot.data() : null);
  },
);

exports.syncAllWeddingDataToGoogleSheets = onCall(
  {
    region: "us-central1",
    serviceAccount: sheetsServiceAccount,
  },
  async (request) => {
    if (request.auth?.uid !== adminUid) {
      throw new HttpsError("permission-denied", "Solo los administradores pueden sincronizar la planilla.");
    }

    const firestore = getFirestore();
    const [rsvps, history, gifts] = await Promise.all([
      firestore.collection("rsvps").get(),
      firestore.collection("rsvp_history").get(),
      firestore.collection("gift_confirmations").get(),
    ]);

    await rewriteSheet("rsvps", rsvps.docs);
    await rewriteSheet("rsvp_history", history.docs);
    await rewriteSheet("gift_confirmations", gifts.docs);

    return { ok: true, confirmations: rsvps.size, history: history.size, gifts: gifts.size };
  },
);
