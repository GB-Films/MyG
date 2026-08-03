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
  gift("regalo-023", "Globo Aerostático por Turquía", 600000, "Experiencias", "/gifts/globo_v01.png", "Nos regalaron una vista que no vamos a olvidar nunca. ¡Mil gracias!"),
  gift("regalo-029", "Van para recorrer el país", 3500000, "Luna de miel", "/gifts/vanMundo_v01.png", "¡No lo podemos creer! Mil gracias de verdad; ahora, a viajar por todo el país."),
  gift("regalo-012", "Excursion con Gorilas", 1200000, "Experiencias", "/gifts/gorilas_v01.png", "Bueno, esperemos no morir. ¡Gracias por impulsarnos a esta aventura!"),
  gift("regalo-028", "Asado para toda la Flia", 150000, "Nuestro hogar", "/gifts/asado_v01.avif", "Están invitados a ese asado, obviamente. ¡Gracias!"),
  gift("regalo-024", "Noche de Truco con Paredes y De Paul", 300000, "Nuestro hogar", "/gifts/truco_v01.png", "Ahora solo falta que Messi y De Paul acepten la revancha. ¡Gracias por semejante mesa!"),
  gift("regalo-006", "Combo Doble Cuarto de Libra", 46000, "Nuestro hogar", "/gifts/dobleCuarto.png", "No podía faltar. ¡Gracias!"),
  gift("regalo-026", "Pisar la Luna", 93000, "Luna de miel", "/gifts/luna_v01.png", "Nos acaba de llegar un mensaje de la NASA avisándonos de la misión. ¡Gracias por hacer esto posible! Después les mandamos video."),
  gift("regalo-008", "Entradas para la F1", 450000, "Experiencias", "/gifts/F1_v01.png", "Cuando tengamos la foto con Franco se las pasamos. ¡Gracias!"),
  gift("regalo-009", "Maquina de Arcade", 3000000, "Nuestro hogar", "/gifts/Arcade_v01.png", "¡Nos llegó el mensaje de Mercado Libre: ya está en camino! Mil gracias de verdad; están invitados a jugar cuando quieran."),
  gift("regalo-004", "Camion de Coca Cola", 350000, "Nuestro hogar", "/gifts/CamionCoca_v01.png", "¡Coca de por vida, seeeee! ¡Gracias!"),
  gift("regalo-011", "Noche de Glamping en Bali", 275000, "Luna de miel", "/gifts/glamping_v01.png", "Qué bueno va a ser tomar unos mates ahí. ¡Mil gracias!"),
  gift("regalo-030", "Viaje en primera clase", 1800000, "Luna de miel", "/gifts/avion_v01.png", "Lo bueno es que, si el avión se cae, vamos a estar durmiendo muy cómodos. ¡Gracias!"),
  gift("regalo-013", "Latas de Atun La Campagnola x3", 30000, "Nuestro hogar", "/gifts/latasAtun_v01.png", "La alacena ya está oficialmente salvada. ¡Gracias por este regalo de emergencia!"),
  gift("regalo-014", "Llenar el tanque", 100000, "Nuestro hogar", "/gifts/Tanque_v01.png", "Tanque lleno y ruta libre. ¡Gracias por ayudarnos a seguir viaje!"),
  gift("regalo-015", "Llenar la heladera", 250000, "Nuestro hogar", "/gifts/Heladera_v01.png", "La heladera llena y nosotros felices. ¡Mil gracias!"),
  gift("regalo-016", "Masajes de 60 minutos", 140000, "Experiencias", "/gifts/masajes_v01.png", "Este descanso nos va a venir increíble después del casamiento. ¡Gracias!"),
  gift("regalo-017", "2 Noches All-Inclusive", 850000, "Luna de miel", "/gifts/allInclusive_v01.png", "Dos noches para no pensar en nada más que disfrutar. ¡Mil gracias!"),
  gift("regalo-018", "Noche de Cine Premium", 80000, "Experiencias", "/gifts/cinePremium.png", "Película, pochoclos y butacas cómodas: planazo. ¡Gracias!"),
  gift("regalo-019", "Paquete de Lays", 4000, "Nuestro hogar", "/gifts/lays_v01.png", "El snack más importante de nuestra historia ya está asegurado. ¡Gracias!"),
  gift("regalo-020", "Paseo en barco por Capri", 275000, "Luna de miel", "/gifts/barcoCapri_v01.png", "Capri desde el mar va a ser inolvidable. ¡Gracias por llevarnos!"),
  gift("regalo-021", "Picnic en la plaza", 25000, "Experiencias", "/gifts/Picnic_v01.png", "Manta, sol y algo rico: el plan perfecto. ¡Gracias!"),
  gift("regalo-022", "Safari por Africa", 750000, "Experiencias", "/gifts/safari_v01.png", "Prometemos volver con muchas fotos y todos los miembros intactos. ¡Gracias por esta aventura!"),
  gift("regalo-005", "Cena en la Torre Eiffel", 450000, "Luna de miel", "/gifts/TorreEiffel_v01.png", "Lo bien que vamos a comer. ¡Mil gracias, en serio! Después les mandamos foto."),
  gift("regalo-007", "Clase de Doble de Riesgo", 180000, "Experiencias", "/gifts/ClaseDoble_v02.png", "Si salimos enteros, les mandamos el video. ¡Gracias por la adrenalina!"),
  gift("regalo-025", "Visitar el Titanic", 250000, "Experiencias", "/gifts/titanic_v01.png", "Si encontramos el collar hacemos mitad y mitad. ¡Gracias!"),
  gift("regalo-010", "FotoLibro Luna de Miel", 120000, "Nuestro hogar", "/gifts/LibroFotos_v01.png", "Que nunca falten las fotos impresas. ¡Gracias!"),
  gift("regalo-027", "TourVinos Mendoza", 550000, "Luna de miel", "/gifts/Mendoza_v01.png", "No nos gusta el vino, pero vamos a hacer el esfuerzo igual. ¡Gracias!"),
  gift("regalo-001", "Buceo en Tailandia", 130000, "Luna de miel", "/gifts/buceo_v01.png", "¡Al fin vamos a poder conocer a Nemo! ¡Gracias!"),
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
    const form = new FormData(event.currentTarget);
    const record = doc(collection(firestore, "gift_confirmations"));
    try {
      await setDoc(record, {
        id: record.id,
        gift_id: selectedGift.id,
        gift_name: selectedGift.name,
        amount: selectedGift.amount,
        giver_name: String(form.get("giverName") ?? "").trim().slice(0, 120),
        email: String(form.get("email") ?? "").trim().toLowerCase().slice(0, 180),
        dedication: String(form.get("dedication") ?? "").trim().slice(0, 600),
        status: "transfer_declared",
        created_at: new Date().toISOString(),
      });
    } catch {
      setGiftStatus("idle");
      return;
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
    try {
      await setDoc(record, {
        id: recordId,
        full_name: String(form.get("fullName") ?? "").trim().slice(0, 120),
        email,
        attendance: String(form.get("attendance") ?? ""),
        guest_count: guestCount,
        guest_names: guestNames.map((name) => String(name ?? "").trim()).filter(Boolean).join(" · ").slice(0, 600),
        dietary: String(form.get("dietary") ?? "").trim().slice(0, 300),
        transport: form.get("transport") === "yes" ? "yes" : "no",
        song: String(form.get("song") ?? "").trim().slice(0, 180),
        message: String(form.get("message") ?? "").trim().slice(0, 500),
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error("No se pudo guardar la confirmación", error);
      setRsvpStatus("idle");
      setRsvpError("No pudimos guardar tu confirmación. Revisá tu conexión e intentá nuevamente.");
      return;
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
                <button type="button" onClick={() => { setSelectedGift(gift); setGiftStatus("idle"); }}>
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
              </form>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
