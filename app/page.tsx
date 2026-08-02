"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, Shirt } from "lucide-react";

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
  gift("regalo-001", "Buceo en Tailandia", 130000, "Luna de miel", "/gifts/buceo_v01.png", "¡Al fin vamos a poder conocer a Nemo! ¡Gracias!"),
  gift("regalo-002", "Cargar la SUBE", 100000, "Experiencias", "/gifts/sube_v01.png", "Listo, ya sabemos que por un año entero no tenemos que cargar la SUBE. ¡Gracias!"),
  gift("regalo-003", "Cámara profesional", 2500000, "Nuestro hogar", "/gifts/Camara_v01.png", "Ahora sí, no se nos escapa ni un recuerdo. ¡Mil gracias!"),
  gift("regalo-004", "Camión de Coca-Cola", 350000, "Nuestro hogar", "/gifts/CamionCoca_v01.png", "¡Coca de por vida, seeeee! ¡Gracias!"),
  gift("regalo-005", "Cena en la Torre Eiffel", 450000, "Luna de miel", "/gifts/TorreEiffel_v01.png", "Lo bien que vamos a comer. ¡Mil gracias, en serio! Después les mandamos foto."),
  gift("regalo-006", "Combo Doble Cuarto de Libra", 46000, "Nuestro hogar", "/gifts/dobleCuarto.png", "No podía faltar. ¡Gracias!"),
  gift("regalo-007", "Clase de doble de riesgo", 180000, "Experiencias", "/gifts/ClaseDoble_v01.png", "Si salimos enteros, les mandamos el video. ¡Gracias por la adrenalina!"),
  gift("regalo-008", "Entradas para la F1", 450000, "Experiencias", "/gifts/F1_v01.png", "Cuando tengamos la foto con Franco se las pasamos. ¡Gracias!"),
  gift("regalo-009", "Máquina de arcade", 3000000, "Nuestro hogar", "/gifts/Arcade_v01.png", "¡Nos llegó el mensaje de Mercado Libre: ya está en camino! Mil gracias de verdad; están invitados a jugar cuando quieran."),
  gift("regalo-010", "Fotolibro de la luna de miel", 120000, "Nuestro hogar", "/gifts/LibroFotos_v01.png", "Que nunca falten las fotos impresas. ¡Gracias!"),
  gift("regalo-011", "Noche de glamping en Bali", 275000, "Luna de miel", "/gifts/glamping_v01.png", "Qué bueno va a ser tomar unos mates ahí. ¡Mil gracias!"),
  gift("regalo-012", "Excursión con gorilas", 1200000, "Experiencias", "/gifts/gorilas_v01.png", "Bueno, esperemos no morir. ¡Gracias por impulsarnos a esta aventura!"),
  gift("regalo-013", "Latas de atún La Campagnola x3", 30000, "Nuestro hogar", "/gifts/latasAtun_v01.png", "La alacena ya está oficialmente salvada. ¡Gracias por este regalo de emergencia!"),
  gift("regalo-014", "Llenar el tanque", 100000, "Nuestro hogar", "/gifts/Tanque_v01.png", "Tanque lleno y ruta libre. ¡Gracias por ayudarnos a seguir viaje!"),
  gift("regalo-015", "Llenar la heladera", 250000, "Nuestro hogar", "/gifts/Heladera_v01.png", "La heladera llena y nosotros felices. ¡Mil gracias!"),
  gift("regalo-016", "Masajes de 60 minutos", 140000, "Experiencias", "/gifts/masajes_v01.png", "Este descanso nos va a venir increíble después del casamiento. ¡Gracias!"),
  gift("regalo-017", "Dos noches all inclusive", 850000, "Luna de miel", "/gifts/allInclusive_v01.png", "Dos noches para no pensar en nada más que disfrutar. ¡Mil gracias!"),
  gift("regalo-018", "Noche de cine premium", 80000, "Experiencias", "/gifts/cinePremium.png", "Película, pochoclos y butacas cómodas: planazo. ¡Gracias!"),
  gift("regalo-019", "Paquete de Lays", 4000, "Nuestro hogar", "/gifts/lays_v01.png", "El snack más importante de nuestra historia ya está asegurado. ¡Gracias!"),
  gift("regalo-020", "Paseo en barco por Capri", 275000, "Luna de miel", "/gifts/barcoCapri_v01.png", "Capri desde el mar va a ser inolvidable. ¡Gracias por llevarnos!"),
  gift("regalo-021", "Picnic en la plaza", 25000, "Experiencias", "/gifts/Picnic_v01.png", "Manta, sol y algo rico: el plan perfecto. ¡Gracias!"),
  gift("regalo-022", "Safari por África", 750000, "Experiencias", "/gifts/safari_v01.png", "Prometemos volver con muchas fotos y todos los miembros intactos. ¡Gracias por esta aventura!"),
  gift("regalo-023", "Vuelo en globo aerostático por Turquía", 600000, "Experiencias", "/gifts/globo_v01.png", "Nos regalaron una vista que no vamos a olvidar nunca. ¡Mil gracias!"),
  gift("regalo-024", "Noche de truco con Messi y De Paul", 300000, "Nuestro hogar", "/gifts/truco con messi.jpg", "Ahora solo falta que Messi y De Paul acepten la revancha. ¡Gracias por semejante mesa!"),
  gift("regalo-025", "Visitar el Titanic", 250000, "Experiencias", "/gifts/titanic_v01.png", "Si encontramos el collar hacemos mitad y mitad. ¡Gracias!"),
  gift("regalo-026", "Pisar la Luna", 93000, "Luna de miel", "/gifts/luna_v01.png", "Nos acaba de llegar un mensaje de la NASA avisándonos de la misión. ¡Gracias por hacer esto posible! Después les mandamos video."),
  gift("regalo-027", "Tour de vinos en Mendoza", 550000, "Luna de miel", "/gifts/Mendoza_v01.png", "No nos gusta el vino, pero vamos a hacer el esfuerzo igual. ¡Gracias!"),
  gift("regalo-028", "Un asado de domingo", 150000, "Nuestro hogar", "/gifts/asado_v01.avif", "Están invitados a ese asado, obviamente. ¡Gracias!"),
  gift("regalo-029", "Van para recorrer el país", 3500000, "Luna de miel", "/gifts/vanMundo_v01.png", "¡No lo podemos creer! Mil gracias de verdad; ahora, a viajar por todo el país."),
  gift("regalo-030", "Viaje en primera clase", 1800000, "Luna de miel", "/gifts/avion_v01.png", "Lo bueno es que, si el avión se cae, vamos a estar durmiendo muy cómodos. ¡Gracias!"),
];

const categories = ["Todos", "Luna de miel", "Nuestro hogar", "Experiencias"];
const GIFTS_PER_PAGE = 10;

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const WEDDING_ALIAS = "ALIAS.A.CONFIRMAR";

export default function Home() {
  const [category, setCategory] = useState("Todos");
  const [giftPage, setGiftPage] = useState(1);
  const [selectedGift, setSelectedGift] = useState<Gift | null>(null);
  const [giftStatus, setGiftStatus] = useState<"idle" | "sending" | "done">("idle");
  const [rsvpStatus, setRsvpStatus] = useState<"idle" | "sending" | "done">("idle");
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
    setGiftPage(1);
  }, [category]);

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
    const response = await fetch("/api/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        giftId: selectedGift.id,
        giftName: selectedGift.name,
        amount: selectedGift.amount,
        giverName: form.get("giverName"),
        email: form.get("email"),
        dedication: form.get("dedication"),
      }),
    });

    if (!response.ok) {
      setGiftStatus("idle");
      return;
    }
    setGiftStatus("done");
  }

  async function submitRsvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRsvpStatus("sending");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/rsvp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: form.get("fullName"),
        email: form.get("rsvpEmail"),
        attendance: form.get("attendance"),
        guestCount: Number(form.get("guestCount") || 1),
        guestNames: form.get("guestNames"),
        dietary: form.get("dietary"),
        transport: form.get("transport"),
        song: form.get("song"),
        message: form.get("message"),
      }),
    });

    if (!response.ok) {
      setRsvpStatus("idle");
      return;
    }
    setRsvpStatus("done");
  }

  return (
    <main>
      <header className="topbar">
        <a className="monogram" href="#inicio" aria-label="Ir al inicio">
          <img src="/logo-myg.png" alt="" />
        </a>
        <nav aria-label="Navegación principal">
          <a href="#info">El día</a>
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
          <p className="eyebrow light">21 · 11 · 2026 — Buenos Aires</p>
          <h1>
            María <i>&amp;</i>
            <br /> Guido
          </h1>
          <p className="hero-note">Te invitamos a celebrar nuestro amor.</p>
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
        <div className="intro-title">
          <p className="eyebrow">Información importante</p>
          <h2>Nos vemos<br />acá.</h2>
          <img className="wedding-rings-image" src="/wedding-rings-exact.png" alt="Dos alianzas entrelazadas" />
        </div>
        <div className="facts">
          <article>
            <span>01 / Fecha</span>
            <div className="fact-heading">
              <CalendarDays className="fact-icon" strokeWidth={1.55} aria-hidden="true" />
              <h3>21 de noviembre</h3>
            </div>
            <p>Sábado · Recepción desde las 17:30</p>
          </article>
          <article>
            <span>02 / Lugar</span>
            <div className="fact-heading">
              <MapPin className="fact-icon" strokeWidth={1.55} aria-hidden="true" />
              <h3>Darwin Tortugas</h3>
            </div>
            <p>Salón Laguna · Fiesta y ceremonia en el mismo lugar.</p>
            <a href="https://maps.google.com/?q=Darwin+Tortugas" target="_blank" rel="noreferrer">
              Cómo llegar ↗
            </a>
          </article>
          <article>
            <span>03 / Código</span>
            <div className="fact-heading">
              <Shirt className="fact-icon" strokeWidth={1.55} aria-hidden="true" />
              <h3>Elegantes, pero ustedes</h3>
            </div>
            <p>Traigan ganas de bailar. El resto lo ponemos nosotros.</p>
          </article>
        </div>
      </section>

      <section className="timeline" aria-labelledby="timeline-title">
        <div className="timeline-heading">
          <p className="eyebrow light">El itinerario</p>
          <h2 id="timeline-title">Así se vivirá<br />este mágico día.</h2>
        </div>
        <ol>
          <li><time>17:30</time><span>Recepción</span><em>Empezamos a brindar</em></li>
          <li><time>18:00</time><span>Ceremonia</span><em>El sí más esperado</em></li>
          <li><time>19:00</time><span>Cóctel</span><em>Comida, fotos y abrazos</em></li>
          <li><time>21:00</time><span>Cena + fiesta</span><em>Hasta que salga el sol</em></li>
        </ol>
      </section>

      <section className="rsvp" id="confirmar">
        <div className="rsvp-intro">
          <p className="eyebrow">RSVP · antes del 20/10</p>
          <h2>¿Venís?</h2>
          <img className="rsvp-car-image" src="/rsvp-car-exact.png" alt="Pareja recién casada alejándose en auto" />
        </div>

        {rsvpStatus === "done" ? (
          <div className="success-card" role="status">
            <span>✓</span>
            <h3>¡Recibimos tu respuesta!</h3>
            <p>Gracias por confirmar. Nos hace muy felices compartir este día con vos.</p>
            <button type="button" onClick={() => setRsvpStatus("idle")}>Enviar otra respuesta</button>
          </div>
        ) : (
          <form className="rsvp-form" onSubmit={submitRsvp}>
            <label className="full">
              Nombre y apellido
              <input name="fullName" autoComplete="name" required placeholder="Escribí tu nombre" />
            </label>
            <label>
              Email
              <input name="rsvpEmail" type="email" autoComplete="email" required placeholder="vos@email.com" />
            </label>
            <label>
              ¿Cuántos son?
              <select name="guestCount" defaultValue="1">
                {[1, 2, 3, 4, 5, 6].map((number) => <option key={number}>{number}</option>)}
              </select>
            </label>
            <fieldset className="full attendance">
              <legend>¿Podés venir?</legend>
              <label><input type="radio" name="attendance" value="yes" required /> Sí, ahí estaré</label>
              <label><input type="radio" name="attendance" value="no" required /> Esta vez no puedo</label>
            </fieldset>
            <label className="full">
              Nombres de tus acompañantes
              <input name="guestNames" placeholder="Si venís acompañado/a" />
            </label>
            <label>
              Restricciones alimentarias
              <input name="dietary" placeholder="Vegetariano, celíaco…" />
            </label>
            <label>
              ¿Necesitás transporte?
              <select name="transport" defaultValue="no">
                <option value="no">No, voy por mi cuenta</option>
                <option value="yes">Sí, quiero info del micro</option>
              </select>
            </label>
            <label>
              Una canción infaltable
              <input name="song" placeholder="Para la pista" />
            </label>
            <label>
              Mensaje para los novios
              <input name="message" placeholder="Lo que quieras decirnos" />
            </label>
            <button className="submit-button full" disabled={rsvpStatus === "sending"}>
              {rsvpStatus === "sending" ? "Enviando…" : "Confirmar asistencia"}
            </button>
          </form>
        )}
      </section>

      <section className="gifts" id="regalos">
        <div className="section-head">
          <div>
            <p className="eyebrow light">Nuestra lista</p>
            <h2>Regalá un<br />recuerdo.</h2>
          </div>
          <p>
            Elegí una experiencia o algo para nuestra casa. Tu transferencia
            se acredita a nuestro fondo de casamiento y nosotros recibimos tu
            regalo, tu nombre y tu dedicatoria.
          </p>
        </div>

        <div className="gift-filters" role="group" aria-label="Filtrar regalos">
          {categories.map((item) => (
            <button
              key={item}
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
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
                    <span>{money.format(gift.amount)} <i>Elegir regalo →</i></span>
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
                <div className="transfer-box">
                  <span>Importe a transferir</span>
                  <strong>{money.format(selectedGift.amount)}</strong>
                  <span>Alias</span>
                  <button type="button" onClick={copyAlias}>{WEDDING_ALIAS} <i>{copied ? "Copiado ✓" : "Copiar"}</i></button>
                  <small>Concepto: REGALO {selectedGift.id.toUpperCase()}</small>
                </div>
                <div className="gift-fields">
                  <label>Tu nombre<input name="giverName" required autoComplete="name" /></label>
                  <label>Tu email<input name="email" type="email" required autoComplete="email" /></label>
                  <label className="full">Dedicatoria<textarea name="dedication" rows={3} required placeholder="Dejanos unas palabras…" /></label>
                </div>
                <p className="transfer-note">Después de realizar la transferencia, confirmala acá para que podamos identificar tu regalo y agradecerte.</p>
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
