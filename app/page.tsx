"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, Frown, MapPin, Navigation, PartyPopper } from "lucide-react";
import { collection, doc, setDoc } from "firebase/firestore";
import { firestore } from "./firebase";
import { normalizeRsvpEmail, rsvpDocumentId } from "./rsvp-utils";

function HangerIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 8c0-1.7 2.3-1.8 2.3-3.8a2.3 2.3 0 1 0-4.6 0" />
      <path d="m12 8-8.4 6.4c-.7.5-.3 1.6.6 1.6h15.6c.9 0 1.3-1.1.6-1.6L12 8Z" />
    </svg>
  );
}

type GiftCategory = "Luna de miel" | "Nuestro hogar" | "Experiencias";

type Gift = {
  id: string;
  name: string;
  amount: number;
  category: GiftCategory;
  image: string;
  note: string;
  thankYou: string;
};

const categoryNotes: Record<GiftCategory, string> = {
  "Luna de miel": "Un recuerdo más para nuestra primera gran aventura de casados.",
  "Nuestro hogar": "Un regalo para estrenar y disfrutar nuestra vida juntos.",
  Experiencias: "Una experiencia que vamos a disfrutar pensando en ustedes.",
};

function gift(
  id: string,
  name: string,
  amount: number,
  category: GiftCategory,
  image: string,
  thankYou: string,
): Gift {
  return { id, name, amount, category, image, note: categoryNotes[category], thankYou };
}

const gifts: Gift[] = [
  gift("regalo-028", "Asado para toda la Flia", 150000, "Nuestro hogar", "/gifts/asado_v01.avif", "Están invitados a ese asado, obviamente. ¡Gracias!"),
  gift("regalo-001", "Buceo en Tailandia", 130000, "Luna de miel", "/gifts/buceo_v01.png", "¡Al fin vamos a poder conocer a Nemo! ¡Gracias!"),
  gift("regalo-012", "Excursion con Gorilas", 1200000, "Experiencias", "/gifts/gorilas_v01.png", "Bueno, esperemos no morir. ¡Gracias por impulsarnos a esta aventura!"),
  gift("regalo-023", "Globo Aerostático por Turquía", 600000, "Experiencias", "/gifts/globo_v01.png", "Nos regalaron una vista que no vamos a olvidar nunca. ¡Mil gracias!"),
  gift("regalo-024", "Noche de Truco con Paredes y De Paul", 300000, "Nuestro hogar", "/gifts/truco_v01.png", "Ahora solo falta que Messi y De Paul acepten la revancha. ¡Gracias por semejante mesa!"),
  gift("regalo-020", "Paseo en barco por Capri", 275000, "Luna de miel", "/gifts/barcoCapri_v01.png", "Capri desde el mar va a ser inolvidable. ¡Gracias por llevarnos!"),
  gift("regalo-026", "Pisar la Luna", 93000, "Luna de miel", "/gifts/luna_v01.png", "Nos acaba de llegar un mensaje de la NASA avisándonos de la misión. ¡Gracias por hacer esto posible! Después les mandamos video."),
  gift("regalo-008", "Entradas para la F1", 450000, "Experiencias", "/gifts/F1_v01.png", "Cuando tengamos la foto con Franco se las pasamos. ¡Gracias!"),
  gift("regalo-029", "Van para recorrer el país", 3500000, "Luna de miel", "/gifts/vanMundo_v01.png", "¡No lo podemos creer! Mil gracias de verdad; ahora, a viajar por todo el país."),
  gift("regalo-004", "Camion de Coca Cola", 350000, "Nuestro hogar", "/gifts/CamionCoca_v01.png", "¡Coca de por vida, seeeee! ¡Gracias!"),
  gift("regalo-011", "Noche de Glamping en Bali", 275000, "Luna de miel", "/gifts/glamping_v01.png", "Qué bueno va a ser tomar unos mates ahí. ¡Mil gracias!"),
  gift("regalo-030", "Viaje en primera clase", 1800000, "Luna de miel", "/gifts/avion_v01.png", "Lo bueno es que, si el avión se cae, vamos a estar durmiendo muy cómodos. ¡Gracias!"),
  gift("regalo-013", "Latas de Atun La Campagnola x3", 30000, "Nuestro hogar", "/gifts/latasAtun_v01.png", "La alacena ya está oficialmente salvada. ¡Gracias por este regalo de emergencia!"),
  gift("regalo-014", "Llenar el tanque", 100000, "Nuestro hogar", "/gifts/Tanque_v01.png", "Tanque lleno y ruta libre. ¡Gracias por ayudarnos a seguir viaje!"),
  gift("regalo-006", "Combo Doble Cuarto de Libra", 46000, "Nuestro hogar", "/gifts/dobleCuarto.png", "No podía faltar. ¡Gracias!"),
  gift("regalo-016", "Masajes de 60 minutos", 140000, "Experiencias", "/gifts/masajes_v01.png", "Este descanso nos va a venir increíble después del casamiento. ¡Gracias!"),
  gift("regalo-017", "2 Noches All-Inclusive", 850000, "Luna de miel", "/gifts/allInclusive_v01.png", "Dos noches para no pensar en nada más que disfrutar. ¡Mil gracias!"),
  gift("regalo-018", "Noche de Cine Premium", 80000, "Experiencias", "/gifts/cinePremium.png", "Película, pochoclos y butacas cómodas: planazo. ¡Gracias!"),
  gift("regalo-019", "Paquete de Lays", 4000, "Nuestro hogar", "/gifts/lays_v01.png", "El snack más importante de nuestra historia ya está asegurado. ¡Gracias!"),
  gift("regalo-015", "Llenar la heladera", 250000, "Nuestro hogar", "/gifts/Heladera_v01.png", "La heladera llena y nosotros felices. ¡Mil gracias!"),
  gift("regalo-021", "Picnic en la plaza", 25000, "Experiencias", "/gifts/Picnic_v01.png", "Manta, sol y algo rico: el plan perfecto. ¡Gracias!"),
  gift("regalo-022", "Safari por Africa", 750000, "Experiencias", "/gifts/safari_v01.png", "Prometemos volver con muchas fotos y todos los miembros intactos. ¡Gracias por esta aventura!"),
  gift("regalo-005", "Cena en la Torre Eiffel", 450000, "Luna de miel", "/gifts/TorreEiffel_v01.png", "Lo bien que vamos a comer. ¡Mil gracias, en serio! Después les mandamos foto."),
  gift("regalo-007", "Clase de Doble de Riesgo", 180000, "Experiencias", "/gifts/ClaseDoble_v02.png", "Si salimos enteros, les mandamos el video. ¡Gracias por la adrenalina!"),
  gift("regalo-025", "Visitar el Titanic", 250000, "Experiencias", "/gifts/titanic_v01.png", "Si encontramos el collar hacemos mitad y mitad. ¡Gracias!"),
  gift("regalo-010", "FotoLibro Luna de Miel", 120000, "Nuestro hogar", "/gifts/LibroFotos_v01.png", "Que nunca falten las fotos impresas. ¡Gracias!"),
  gift("regalo-027", "TourVinos Mendoza", 550000, "Luna de miel", "/gifts/Mendoza_v01.png", "No nos gusta el vino, pero vamos a hacer el esfuerzo igual. ¡Gracias!"),
  gift("regalo-009", "Maquina de Arcade", 3000000, "Nuestro hogar", "/gifts/Arcade_v01.png", "¡Nos llegó el mensaje de Mercado Libre: ya está en camino! Mil gracias de verdad; están invitados a jugar cuando quieran."),
  gift("regalo-003", "Cámara Profesional", 2500000, "Nuestro hogar", "/gifts/Camara_v01.png", "Ahora sí, no se nos escapa ni un recuerdo. ¡Mil gracias!"),
  gift("regalo-002", "Cargar la sube", 100000, "Experiencias", "/gifts/sube_v01.png", "Listo, ya sabemos que por un año entero no tenemos que cargar la SUBE. ¡Gracias!"),
];

const categories = ["Todos", "Luna de miel", "Nuestro hogar", "Experiencias"];
const GIFTS_PER_PAGE = 10;

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const WEDDING_ALIAS = "regalosmariaguido";
const COUPLE_EMAILS = ["gboetsch93@gmail.com", "maria.c.obregon@hotmail.com"];
const WEDDING_MAP_URL = "https://maps.google.com/?q=Darwin+Tortugas";
const EMAIL_SITE_URL = "https://gb-films.github.io/MyG";
const EMAIL_LOGO_URL = `${EMAIL_SITE_URL}/logo-myg-white.png`;
const EMAIL_CALENDAR_ICON_URL = `${EMAIL_SITE_URL}/calendar.png`;
const EMAIL_MAP_ICON_URL = `${EMAIL_SITE_URL}/map-pin.png`;
const EMAIL_HANGER_ICON_URL = `${EMAIL_SITE_URL}/hanger.png`;

type MailAudience = "guest" | "couple";
type MailEventType = "rsvp" | "gift";

function escapeEmailHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function weddingEmailTemplate({
  eyebrow,
  title,
  content,
}: {
  eyebrow: string;
  title: string;
  content: string;
}) {
  return `<!doctype html>
  <html lang="es">
    <body style="margin:0;padding:0;background:#ffffff;color:#ffffff">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#ffffff">
        <tr>
          <td align="center" style="padding:28px 14px">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:620px;background:#111111;border:1px solid #333333">
              <tr>
                <td align="center" style="padding:30px 28px 10px">
                  <img src="${EMAIL_LOGO_URL}" width="108" alt="M&amp;G" style="display:block;width:108px;max-width:108px;height:auto;border:0" />
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:8px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.4;letter-spacing:3px;text-transform:uppercase;color:#f20d18;font-weight:700">
                  ${eyebrow}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:12px 32px 4px;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.08;color:#ffffff;font-weight:400">
                  ${title}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:4px 32px 20px;font-family:Arial,Helvetica,sans-serif;font-size:28px;line-height:1;color:#f20d18">&#9829;</td>
              </tr>
              <tr>
                <td style="padding:0 38px 34px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.7;color:#f4f1eb">
                  ${content}
                </td>
              </tr>
              <tr>
                <td align="center" style="padding:20px 24px;border-top:1px solid #333333;font-family:Arial,Helvetica,sans-serif;font-size:10px;line-height:1.5;letter-spacing:2.5px;text-transform:uppercase;color:#a9a9a9">
                  Mar&iacute;a &amp; Guido &nbsp;&middot;&nbsp; 21.11.2026
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

async function queueEmail({
  to,
  subject,
  text,
  html,
  eventId,
  eventType,
  audience,
}: {
  to: string[];
  subject: string;
  text: string;
  html: string;
  eventId: string;
  eventType: MailEventType;
  audience: MailAudience;
}) {
  const emailDocument = doc(collection(firestore, "mail"));
  await setDoc(emailDocument, {
    to,
    message: { subject, text, html },
    event_id: eventId,
    event_type: eventType,
    audience,
    created_at: new Date().toISOString(),
  });
}

function weddingSummaryHtml() {
  return `
    <div style="margin:26px 0;padding:22px 22px 24px;border:1px solid #343434;border-left:5px solid #f20d18;background:#191919;color:#ffffff">
      <div style="margin-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#f20d18;font-weight:700">Guard&aacute; esta fecha</div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;color:#ffffff">
        <tr>
          <td width="38" valign="top" style="width:38px;padding:2px 12px 18px 0"><img src="${EMAIL_CALENDAR_ICON_URL}" width="27" height="27" alt="" style="display:block;width:27px;height:27px;border:0" /></td>
          <td valign="top" style="padding:0 0 18px"><strong style="display:block;margin-bottom:6px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#ffffff">21 de noviembre de 2026</strong><div style="color:#d7d4cf">S&aacute;bado &middot; Los esperamos a las 17:30.</div></td>
        </tr>
        <tr>
          <td width="38" valign="top" style="width:38px;padding:20px 12px 18px 0;border-top:1px solid #343434"><img src="${EMAIL_MAP_ICON_URL}" width="27" height="27" alt="" style="display:block;width:27px;height:27px;border:0" /></td>
          <td valign="top" style="padding:18px 0 20px;border-top:1px solid #343434"><strong style="display:block;margin-bottom:6px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#ffffff">Darwin Tortugas</strong><div style="color:#d7d4cf">Sal&oacute;n Laguna &middot; Fiesta y ceremonia en el mismo lugar.</div><a href="${WEDDING_MAP_URL}" style="display:inline-block;margin-top:15px;padding:11px 16px;background:#f20d18;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:1px;text-transform:uppercase;font-weight:700">Ver ubicaci&oacute;n en Google Maps &rarr;</a></td>
        </tr>
        <tr>
          <td width="38" valign="top" style="width:38px;padding:20px 12px 0 0;border-top:1px solid #343434"><img src="${EMAIL_HANGER_ICON_URL}" width="27" height="27" alt="" style="display:block;width:27px;height:27px;border:0" /></td>
          <td valign="top" style="padding:18px 0 0;border-top:1px solid #343434"><strong style="display:block;margin-bottom:6px;font-family:Georgia,'Times New Roman',serif;font-size:21px;line-height:1.3;color:#ffffff">Elegantes</strong><div style="color:#d7d4cf">Blanco reservado para la novia.<br />Verde para la familia del novio.<br />Azul para las damas de honor.</div></td>
        </tr>
      </table>
    </div>`;
}

function giftDeliveryCopy(gift: Gift) {
  if (gift.category === "Nuestro hogar") {
    return <>vamos a recibir <strong>{gift.name}</strong> en nuestra casa.</>;
  }

  if (gift.category === "Luna de miel") {
    return <>vamos a sumar <strong>{gift.name}</strong> a nuestra luna de miel.</>;
  }

  return <>vamos a poder disfrutar de <strong>{gift.name}</strong>.</>;
}

export default function Home() {
  const [category, setCategory] = useState("Todos");
  const [giftPage, setGiftPage] = useState(1);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [giftStatus, setGiftStatus] = useState<"idle" | "sending" | "done">("idle");
  const [giftError, setGiftError] = useState("");
  const [rsvpStatus, setRsvpStatus] = useState<"idle" | "sending" | "done">("idle");
  const [rsvpError, setRsvpError] = useState("");
  const [rsvpAttendance, setRsvpAttendance] = useState<"" | "yes" | "no">("");
  const [rsvpGuestCount, setRsvpGuestCount] = useState(1);
  const [copied, setCopied] = useState(false);

  const filteredGifts = useMemo(
    () =>
      category === "Todos"
        ? gifts
        : gifts.filter((gift) => gift.category === category),
    [category],
  );
  const giftPageCount = Math.max(1, Math.ceil(filteredGifts.length / GIFTS_PER_PAGE));
  const visibleGifts = filteredGifts.slice((giftPage - 1) * GIFTS_PER_PAGE, giftPage * GIFTS_PER_PAGE);

  useEffect(() => {
    if (!selectedGift) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedGift(null);
    };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selectedGift]);

  async function copyAlias() {
    await navigator.clipboard.writeText(WEDDING_ALIAS);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  function goToGiftPage(page: number) {
    setGiftPage(page);
    window.setTimeout(() => {
      document.querySelector(".gift-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  async function submitGift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGift) return;
    setGiftStatus("sending");
    setGiftError("");
    const form = new FormData(event.currentTarget);
    const record = doc(collection(firestore, "gift_confirmations"));
    const giverName = String(form.get("giverName") ?? "").trim().slice(0, 120);
    const giverEmail = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 180);
    const dedication = String(form.get("dedication") ?? "").trim().slice(0, 600);
    try {
      await setDoc(record, {
        id: record.id,
        gift_id: selectedGift.id,
        gift_name: selectedGift.name,
        amount: selectedGift.amount,
        giver_name: giverName,
        email: giverEmail,
        dedication,
        status: "transfer_declared",
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("No se pudo confirmar el regalo", error);
      setGiftStatus("idle");
      setGiftError("No pudimos confirmar el regalo. Revisá tu conexión e intentá nuevamente.");
      return;
    }

    const safeGiverName = escapeEmailHtml(giverName);
    const safeGiftName = escapeEmailHtml(selectedGift.name);
    const safeDedication = escapeEmailHtml(dedication);
    const safeGiftThankYou = escapeEmailHtml(selectedGift.thankYou);
    const giftImageUrl = `${EMAIL_SITE_URL}${selectedGift.image}`;
    const formattedAmount = money.format(selectedGift.amount);
    try {
      await Promise.all([
        queueEmail({
          to: COUPLE_EMAILS,
          subject: `Nuevo regalo: ${selectedGift.name}`,
          text: `${giverName} declaró el regalo ${selectedGift.name} por ${formattedAmount}. Dedicatoria: ${dedication}`,
          html: weddingEmailTemplate({
            eyebrow: "Nuevo regalo",
            title: "¡Les hicieron un regalo!",
            content: `<img src="${giftImageUrl}" width="544" alt="${safeGiftName}" style="display:block;width:100%;max-width:544px;height:auto;margin:0 0 24px;border:1px solid #343434" /><p style="margin:0 0 18px"><strong style="color:#ffffff">${safeGiverName}</strong> declar&oacute; la transferencia de <strong style="color:#ffffff">${safeGiftName}</strong> por <strong style="color:#f20d18">${formattedAmount}</strong>.</p><div style="margin:22px 0;padding:18px 20px;background:#191919;border-left:4px solid #f20d18;color:#ffffff"><div style="margin-bottom:7px;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#a9a9a9;font-weight:700">Dedicatoria</div>${safeDedication}</div><p style="margin:18px 0 0;color:#c8c5c0">Ya pueden verlo en el panel de administraci&oacute;n.</p>`,
          }),
          eventId: record.id,
          eventType: "gift",
          audience: "couple",
        }),
        queueEmail({
          to: [giverEmail],
          subject: "Recibimos tu regalo para María y Guido",
          text: `Hola ${giverName}. Recibimos la confirmación de tu regalo: ${selectedGift.name}. ¡Muchas gracias por acompañarnos en esta nueva etapa!`,
          html: weddingEmailTemplate({
            eyebrow: "Regalo confirmado",
            title: "¡Recibimos tu regalo!",
            content: `<img src="${giftImageUrl}" width="544" alt="${safeGiftName}" style="display:block;width:100%;max-width:544px;height:auto;margin:0 0 24px;border:1px solid #343434" /><p style="margin:0 0 16px">Hola <strong style="color:#ffffff">${safeGiverName}</strong>.</p><p style="margin:0 0 18px">Qued&oacute; registrada tu transferencia para regalarnos <strong style="color:#ffffff">${safeGiftName}</strong>.</p><div style="margin:24px 0;padding:20px;background:#191919;border:1px solid #343434;border-left:5px solid #f20d18"><div style="margin-bottom:8px;font-family:Arial,Helvetica,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#f20d18;font-weight:700">Nuestro mensaje</div><div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.45;color:#ffffff">${safeGiftThankYou}</div></div><p style="margin:0;color:#c8c5c0">Nos hace muy felices compartir esta etapa con vos.</p>`,
          }),
          eventId: record.id,
          eventType: "gift",
          audience: "guest",
        }),
      ]);
    } catch (emailError) {
      console.error("El regalo se guardó, pero no se pudieron encolar los emails", emailError);
    }
    setGiftStatus("done");
  }

  async function submitRsvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRsvpStatus("sending");
    setRsvpError("");
    const form = new FormData(event.currentTarget);
    const guestCount = Number(form.get("guestCount") || 1);
    const email = normalizeRsvpEmail(form.get("rsvpEmail"));
    const guestNames = Array.from(
      { length: Math.max(0, guestCount - 1) },
      (_, index) => form.get(`guestName-${index + 2}`),
    );
    const recordId = await rsvpDocumentId(email);
    const record = doc(firestore, "rsvps", recordId);
    const fullName = String(form.get("fullName") ?? "").trim().slice(0, 120);
    const attendance = String(form.get("attendance") ?? "");
    const guestNamesText = guestNames.map((name) => String(name ?? "").trim()).filter(Boolean).join(" · ").slice(0, 600);
    const dietary = String(form.get("dietary") ?? "").trim().slice(0, 300);
    const transport = form.get("transport") === "yes" ? "yes" : "no";
    const song = String(form.get("song") ?? "").trim().slice(0, 180);
    const guestMessage = String(form.get("message") ?? "").trim().slice(0, 500);
    try {
      await setDoc(record, {
        id: recordId,
        full_name: fullName,
        email,
        attendance,
        guest_count: guestCount,
        guest_names: guestNamesText,
        dietary,
        transport,
        song,
        message: guestMessage,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("No se pudo guardar la confirmación", error);
      setRsvpStatus("idle");
      setRsvpError("No pudimos guardar tu confirmación. Revisá tu conexión e intentá nuevamente.");
      return;
    }

    const safeFullName = escapeEmailHtml(fullName);
    const isAttending = attendance === "yes";
    const attendanceLabel = isAttending ? `Sí, asiste con ${guestCount} persona${guestCount === 1 ? "" : "s"}` : "No puede asistir";
    try {
      await Promise.all([
        queueEmail({
          to: COUPLE_EMAILS,
          subject: `Confirmación de asistencia: ${fullName}`,
          text: `${fullName} respondió: ${attendanceLabel}. Email: ${email}. Acompañantes: ${guestNamesText || "—"}. Restricciones: ${dietary || "—"}. Transporte: ${transport}. Canción: ${song || "—"}. Mensaje: ${guestMessage || "—"}.`,
          html: weddingEmailTemplate({
            eyebrow: "Nueva respuesta",
            title: "Confirmación de asistencia",
            content: `<p style="margin:0 0 18px"><strong style="color:#ffffff">${safeFullName}</strong>: ${escapeEmailHtml(attendanceLabel)}.</p><div style="margin:22px 0;padding:20px;background:#191919;border:1px solid #343434;border-left:5px solid #f20d18;color:#e9e6e0"><strong style="color:#ffffff">Email:</strong> ${escapeEmailHtml(email)}<br><strong style="color:#ffffff">Acompa&ntilde;antes:</strong> ${escapeEmailHtml(guestNamesText || "—")}<br><strong style="color:#ffffff">Restricciones:</strong> ${escapeEmailHtml(dietary || "—")}<br><strong style="color:#ffffff">Transporte:</strong> ${transport === "yes" ? "Necesita" : "No necesita"}<br><strong style="color:#ffffff">Canci&oacute;n:</strong> ${escapeEmailHtml(song || "—")}<br><strong style="color:#ffffff">Mensaje:</strong> ${escapeEmailHtml(guestMessage || "—")}</div><p style="margin:0;color:#c8c5c0">La respuesta m&aacute;s reciente ya qued&oacute; guardada en el panel.</p>`,
          }),
          eventId: recordId,
          eventType: "rsvp",
          audience: "couple",
        }),
        queueEmail({
          to: [email],
          subject: isAttending ? "Tu lugar está confirmado · María & Guido" : "Recibimos tu respuesta · María & Guido",
          text: isAttending
            ? `Hola ${fullName}. Recibimos tu confirmación para el casamiento de María y Guido. Sábado 21 de noviembre de 2026 a las 17:30, Darwin Tortugas, Salón Laguna.`
            : `Hola ${fullName}. Recibimos tu respuesta. Lamentamos que no puedas acompañarnos y te agradecemos mucho por avisarnos. María y Guido.`,
          html: weddingEmailTemplate({
            eyebrow: isAttending ? "Asistencia confirmada" : "Respuesta recibida",
            title: isAttending ? "¡Tu lugar está confirmado!" : "Recibimos tu respuesta",
            content: `<p style="margin:0 0 16px">Hola <strong style="color:#ffffff">${safeFullName}</strong>.</p><p style="margin:0 0 20px">${isAttending ? `Qued&oacute; registrada tu asistencia para ${guestCount} persona${guestCount === 1 ? "" : "s"}. Nos hace muy felices compartir este d&iacute;a con vos.` : "Lamentamos que no puedas acompa&ntilde;arnos, pero te agradecemos mucho por avisarnos."}</p>${isAttending ? weddingSummaryHtml() : ""}`,
          }),
          eventId: recordId,
          eventType: "rsvp",
          audience: "guest",
        }),
      ]);
    } catch (emailError) {
      console.error("La confirmación se guardó, pero no se pudieron encolar los emails", emailError);
    }
    setRsvpStatus("done");
    window.setTimeout(() => {
      document.querySelector(".rsvp-success")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
  }

  return (
    <main>
      <header className="topbar">
        <a className="monogram" href="#inicio" aria-label="Ir al inicio">
          <img src="/logo-myg.png" alt="" />
        </a>
        <nav aria-label="Navegación principal">
          <a href="#info">El día</a>
          <a href="#itinerario">Itinerario</a>
          <a className="nav-rsvp" href="#confirmar">
            Confirmar
          </a>
          <a href="#regalos">Regalos</a>
        </nav>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-photo" aria-hidden="true" />
        <div className="hero-grain" aria-hidden="true" />
        <div className="hero-copy">
          <img className="hero-lockup" src="/hero-lockup.png" alt="M y G · María y Guido · 21.11.2026" />
        </div>
        <div className="newspaper" aria-label="Reserva la fecha">
          <div className="paper-top">
            <span>Edición especial</span>
            <span>Vol. 21</span>
          </div>
          <strong>Save the date</strong>
          <div className="paper-rule" />
          <p>Una noche. Una fiesta. Toda nuestra gente.</p>
          <b>21—11—2026</b>
        </div>
        <a className="scroll-cue" href="#info">
          Descubrí el plan <span>↓</span>
        </a>
      </section>

      <section className="intro" id="info">
        <div className="intro-hearts" aria-hidden="true">
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
          <span>♥</span>
        </div>
        <div className="intro-title">
          <p className="eyebrow">Información importante</p>
          <h2>Nos vemos<br />acá.</h2>
          <img className="wedding-rings-image" src="/wedding-rings-hq.png" alt="Dos alianzas entrelazadas" />
        </div>
        <div className="facts">
          <article>
            <span>01 / Fecha</span>
            <div className="fact-heading">
              <CalendarDays className="fact-icon" strokeWidth={1.55} aria-hidden="true" />
              <h3>21 de noviembre</h3>
            </div>
            <p>Sábado · Los esperamos a las 17:30.</p>
          </article>
          <article>
            <span>02 / Lugar</span>
            <div className="fact-heading">
              <MapPin className="fact-icon" strokeWidth={1.55} aria-hidden="true" />
              <h3>Darwin Tortugas</h3>
            </div>
            <p>Salón Laguna · Fiesta y ceremonia en el mismo lugar.</p>
            <a className="map-button" href="https://maps.google.com/?q=Darwin+Tortugas" target="_blank" rel="noreferrer">
              <Navigation aria-hidden="true" />
              Ver ubicación en Google Maps
              <span aria-hidden="true">↗</span>
            </a>
          </article>
          <article>
            <span>03 / Código</span>
            <div className="fact-heading">
              <HangerIcon className="hanger-icon" />
              <h3>Elegantes</h3>
            </div>
            <p>Blanco reservado para la novia.<br />Verde para la familia del novio.<br />Azul para las damas de honor.</p>
          </article>
          <a className="rsvp-reminder" href="#confirmar">
            <span>Confirmá tu asistencia</span>
            <strong>antes del 20/09</strong>
            <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <section className="timeline" id="itinerario" aria-labelledby="timeline-title">
        <div className="timeline-heading">
          <p className="eyebrow light">El itinerario</p>
          <h2 id="timeline-title">Así se vivirá<br />esta noche.</h2>
        </div>
        <ol>
          <li><time>17:30</time><span>Recepción</span><em>Los esperamos previo a la ceremonia</em></li>
          <li><time>18:00</time><span>Ceremonia</span><em>El sí más esperado</em></li>
          <li><time>19:00</time><span>Cóctel</span><em>Comida, fotos y abrazos</em></li>
          <li><time>20:30</time><span>Arranca la fiesta</span><em>Hay morfi, baile y mucho más!</em></li>
          <li><time>3:30</time><span>Fin</span><em>... o hasta que nos saquen</em></li>
        </ol>
        <img className="timeline-rabbits" src="/rabbits-nyf-v2.png" alt="Dos conejos abrazados" />
      </section>

      <section className="rsvp" id="confirmar">
        <div className="rsvp-intro">
          <p className="eyebrow">RSVP · antes del 20/09</p>
          <h2>¿Venís?</h2>
          <img className="rsvp-car-image" src="/rsvp-car-hq.png" alt="Pareja recién casada alejándose en auto" />
        </div>

        {rsvpStatus === "done" ? (
          <div className="success-card rsvp-success" role="status">
            <span className="success-heart rsvp-success-heart" aria-hidden="true">♥</span>
            <h3>¡Recibimos tu respuesta!</h3>
            <p>Gracias por confirmar. Nos hace muy felices compartir este día con vos.</p>
            <button type="button" onClick={() => { setRsvpStatus("idle"); setRsvpAttendance(""); setRsvpGuestCount(1); }}>Enviar otra respuesta</button>
          </div>
        ) : (
          <form className="rsvp-form" onSubmit={submitRsvp}>
            <label>
              Nombre y apellido
              <input name="fullName" autoComplete="name" required placeholder="Escribí tu nombre" />
            </label>
            <label>
              Email
              <input name="rsvpEmail" type="email" autoComplete="email" required placeholder="vos@email.com" />
            </label>
            <fieldset className="full attendance">
              <legend>¿Podés venir?</legend>
              <label className="attendance-option attendance-yes">
                <input type="radio" name="attendance" value="yes" required onChange={() => setRsvpAttendance("yes")} />
                <PartyPopper aria-hidden="true" />
                <span>Sí, obvio</span>
              </label>
              <label className="attendance-option attendance-no">
                <input type="radio" name="attendance" value="no" required onChange={() => { setRsvpAttendance("no"); setRsvpGuestCount(1); }} />
                <Frown aria-hidden="true" />
                <span>No puedo</span>
              </label>
            </fieldset>
            {rsvpAttendance === "yes" && (
              <fieldset className="full guest-roster">
                <legend>Lista completa de asistentes</legend>
                <div className="guest-roster-head">
                  <label>
                    ¿Cuántos son en total?
                    <select name="guestCount" value={rsvpGuestCount} onChange={(event) => setRsvpGuestCount(Number(event.target.value))}>
                      {[1, 2, 3, 4, 5, 6].map((number) => <option key={number}>{number}</option>)}
                    </select>
                  </label>
                  <p>Tu nombre de arriba ya cuenta como Persona 1.</p>
                </div>
                {rsvpGuestCount > 1 && (
                  <div className="guest-name-grid">
                    {Array.from({ length: rsvpGuestCount - 1 }, (_, index) => (
                      <label key={index}>
                        Persona {index + 2} · nombre y apellido
                        <input name={`guestName-${index + 2}`} required placeholder={`Nombre completo de la persona ${index + 2}`} />
                      </label>
                    ))}
                  </div>
                )}
              </fieldset>
            )}
            <label>
              ¿Necesitás transporte?
              <select name="transport" defaultValue="no">
                <option value="no">No, voy por mi cuenta</option>
                <option value="yes">Sí, quiero info del micro</option>
              </select>
            </label>
            <label>
              Restricciones alimentarias
              <input name="dietary" placeholder="Vegetariano, celíaco…" />
            </label>
            <label>
              Una canción infaltable
              <input name="song" placeholder="Para la pista" />
            </label>
            <label className="full">
              Mensaje para los novios
              <input name="message" placeholder="Lo que quieras decirnos" />
            </label>
            <button className="submit-button full" disabled={rsvpStatus === "sending"}>
              {rsvpStatus === "sending" ? "Enviando…" : "Confirmar asistencia"}
            </button>
            {rsvpError && <p className="rsvp-error full" role="alert">{rsvpError}</p>}
          </form>
        )}
      </section>

      <section className="gifts" id="regalos">
        <div className="section-head">
          <div>
            <p className="eyebrow light">Nuestra lista</p>
            <h2>Regalá un<br />recuerdo.</h2>
          </div>
          <aside className="gift-note">
            <span className="gift-note-heart" aria-hidden="true">♥</span>
            <p>
              <span className="gift-note-opening">El mejor regalo</span> es compartir
              este día con ustedes, <strong>peeeeero</strong> si de casualidad están con
              ganas de querer hacernos un regalo, pueden elegir algo de esta lista
              para acompañarnos en esta nueva etapa.
            </p>
          </aside>
        </div>

        <div className="gift-filters" role="group" aria-label="Filtrar regalos">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => {
                setCategory(item);
                setGiftPage(1);
              }}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="gift-grid">
          {visibleGifts.map((gift, index) => {
            const giftNumber = String((giftPage - 1) * GIFTS_PER_PAGE + index + 1).padStart(2, "0");
            return (
              <article className="gift-card" key={gift.id}>
                <button type="button" onClick={() => { setSelectedGift(gift); setGiftStatus("idle"); setGiftError(""); }}>
                  <span className="gift-image-wrap">
                    <img src={gift.image} alt="" />
                    <span className="gift-number">{giftNumber}</span>
                  </span>
                  <span className="gift-meta">
                    <small>{gift.category}</small>
                    <strong>{gift.name}</strong>
                    <span>{money.format(gift.amount)}</span>
                  </span>
                </button>
              </article>
            );
          })}
        </div>

        {giftPageCount > 1 && (
          <nav className="gift-pagination" aria-label="Páginas del catálogo">
            <button type="button" onClick={() => goToGiftPage(giftPage - 1)} disabled={giftPage === 1} aria-label="Página anterior">←</button>
            {Array.from({ length: giftPageCount }, (_, index) => index + 1).map((page) => (
              <button
                type="button"
                className={giftPage === page ? "active" : ""}
                aria-current={giftPage === page ? "page" : undefined}
                onClick={() => goToGiftPage(page)}
                key={page}
              >
                {page}
              </button>
            ))}
            <button type="button" onClick={() => goToGiftPage(giftPage + 1)} disabled={giftPage === giftPageCount} aria-label="Página siguiente">→</button>
          </nav>
        )}
      </section>

      <footer>
        <div className="footer-mark">
          <img src="/logo-myg.png" alt="María y Guido" />
        </div>
        <p>21 · 11 · 2026 — Darwin Tortugas</p>
        <a href="#inicio">Volver arriba ↑</a>
      </footer>

      <div className="mobile-nav" aria-label="Accesos rápidos">
        <a href="#info">El día</a>
        <a href="#itinerario">Itinerario</a>
        <a href="#confirmar">Confirmar</a>
        <a href="#regalos">Regalos</a>
      </div>

      {selectedGift && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedGift(null);
        }}>
          <section className="gift-modal" role="dialog" aria-modal="true" aria-labelledby="gift-modal-title">
            <button className="modal-close" type="button" aria-label="Cerrar" onClick={() => setSelectedGift(null)}>×</button>
            <div className="modal-image">
              <img src={selectedGift.image} alt="" />
              <span>Un regalo de ustedes<br />para nosotros ♡</span>
            </div>
            {giftStatus === "done" ? (
              <div className="modal-success" role="status">
                <span className="success-heart" aria-hidden="true">♥</span>
                <p className="eyebrow">Regalo confirmado</p>
                <h2>Esto ya es parte de nuestra historia.</h2>
                <p className="gift-thanks">{selectedGift.thankYou}</p>
                <button type="button" onClick={() => setSelectedGift(null)}>Listo</button>
              </div>
            ) : (
              <form className="gift-form" onSubmit={submitGift}>
                <p className="eyebrow">{selectedGift.category}</p>
                <h2 id="gift-modal-title">{selectedGift.name}</h2>
                <p className="gift-description">{selectedGift.note}</p>
                <div className="gift-process" aria-label="Cómo hacer este regalo">
                  <p>¿Cómo funciona?</p>
                  <ol>
                    <li><span>1</span><div>Copiá el alias y transferí el monto indicado.</div></li>
                    <li><span>2</span><div>Una vez realizada la transferencia, {giftDeliveryCopy(selectedGift)}</div></li>
                    <li><span>3</span><div>Completá tus datos y confirmalo para que sepamos que fue de parte tuya.</div></li>
                  </ol>
                </div>
                <div className="transfer-box">
                  <div className="transfer-item">
                    <span>Importe a transferir</span>
                    <strong>{money.format(selectedGift.amount)}</strong>
                  </div>
                  <div className="transfer-item">
                    <span>Alias</span>
                    <button type="button" onClick={copyAlias}>{WEDDING_ALIAS} <i>{copied ? "Copiado ✓" : "Copiar"}</i></button>
                  </div>
                </div>
                <div className="gift-fields">
                  <label>Tu nombre<input name="giverName" required autoComplete="name" /></label>
                  <label>Tu email<input name="email" type="email" required autoComplete="email" /></label>
                  <label className="full">Dedicatoria<textarea name="dedication" rows={3} required placeholder="Dejanos unas palabras…" /></label>
                </div>
                <button className="submit-button" disabled={giftStatus === "sending"}>
                  {giftStatus === "sending" ? "Confirmando…" : "Ya transferí este regalo"}
                </button>
                {giftError && <p className="gift-error" role="alert">{giftError}</p>}
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
