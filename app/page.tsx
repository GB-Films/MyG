"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Gift = {
  id: string;
  name: string;
  amount: number;
  category: "Luna de miel" | "Nuestro hogar" | "Experiencias";
  image: string;
  note: string;
};

const gifts: Gift[] = [
  {
    id: "prosecco-capri",
    name: "Un brindis en Capri",
    amount: 65000,
    category: "Luna de miel",
    image:
      "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=1200&q=86",
    note: "Dos copas, el mar y ese atardecer que vamos a recordar siempre.",
  },
  {
    id: "cena-paris",
    name: "Cena romántica en París",
    amount: 180000,
    category: "Experiencias",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=86",
    note: "Una mesa para dos y una noche para brindar por todos ustedes.",
  },
  {
    id: "hotel-amalfi",
    name: "Una noche en la Costa Amalfitana",
    amount: 260000,
    category: "Luna de miel",
    image:
      "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?auto=format&fit=crop&w=1200&q=86",
    note: "Una ventana al Mediterráneo en nuestra primera aventura de casados.",
  },
  {
    id: "cafetera",
    name: "Cafetera para domingos lentos",
    amount: 125000,
    category: "Nuestro hogar",
    image:
      "https://images.unsplash.com/photo-1445116572773-5d785ae4b668?auto=format&fit=crop&w=1200&q=86",
    note: "Café recién hecho para estrenar todas nuestras mañanas juntos.",
  },
  {
    id: "barco",
    name: "Paseo en barco al atardecer",
    amount: 220000,
    category: "Experiencias",
    image:
      "https://images.unsplash.com/photo-1500375592092-40eb2168fd21?auto=format&fit=crop&w=1200&q=86",
    note: "Mar, música y una tarde sin mirar el reloj.",
  },
  {
    id: "mesa-amigos",
    name: "Nuestra primera mesa para amigos",
    amount: 300000,
    category: "Nuestro hogar",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=86",
    note: "Para recibirlos, cocinar algo rico y seguir celebrando muchos años más.",
  },
];

const categories = ["Todos", "Luna de miel", "Nuestro hogar", "Experiencias"];

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const WEDDING_ALIAS = "ALIAS.A.CONFIRMAR";

export default function Home() {
  const [category, setCategory] = useState("Todos");
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
          M<span>+</span>G
        </a>
        <nav aria-label="Navegación principal">
          <a href="#info">El día</a>
          <a href="#regalos">Regalos</a>
          <a className="nav-rsvp" href="#confirmar">
            Confirmar
          </a>
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
          <div className="scribble" aria-hidden="true">amor, risas<br />y baile ♡</div>
        </div>
        <div className="facts">
          <article>
            <span>01 / Fecha</span>
            <h3>21 de noviembre</h3>
            <p>Sábado · Recepción desde las 17:30</p>
          </article>
          <article>
            <span>02 / Lugar</span>
            <h3>Darwin Tortugas</h3>
            <p>Salón Laguna · Fiesta y ceremonia en el mismo lugar.</p>
            <a href="https://maps.google.com/?q=Darwin+Tortugas" target="_blank" rel="noreferrer">
              Cómo llegar ↗
            </a>
          </article>
          <article>
            <span>03 / Código</span>
            <h3>Elegantes, pero ustedes</h3>
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
          {filteredGifts.map((gift, index) => (
            <article className="gift-card" key={gift.id}>
              <button type="button" onClick={() => { setSelectedGift(gift); setGiftStatus("idle"); }}>
                <span className="gift-image-wrap">
                  <img src={gift.image} alt="" />
                  <span className="gift-number">0{index + 1}</span>
                </span>
                <span className="gift-meta">
                  <small>{gift.category}</small>
                  <strong>{gift.name}</strong>
                  <span>{money.format(gift.amount)} <i>Elegir regalo →</i></span>
                </span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="rsvp" id="confirmar">
        <div className="rsvp-intro">
          <p className="eyebrow">RSVP · antes del 20/10</p>
          <h2>¿Venís?</h2>
          <p>
            Queremos guardar un lugar para vos. Completá una confirmación por
            grupo o familia.
          </p>
          <div className="rsvp-stamp" aria-hidden="true">see you<br />there! ♡</div>
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

      <footer>
        <div className="footer-mark">M<span>+</span>G</div>
        <p>21 · 11 · 2026 — Darwin Tortugas</p>
        <a href="#inicio">Volver arriba ↑</a>
      </footer>

      <div className="mobile-nav" aria-label="Accesos rápidos">
        <a href="#info">El día</a>
        <a href="#regalos">Regalos</a>
        <a href="#confirmar">Confirmar</a>
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
                <span>✓</span>
                <p className="eyebrow">Regalo confirmado</p>
                <h2>Esto ya es parte de nuestra historia.</h2>
                <p>Recibimos tu elección y tu dedicatoria. ¡Gracias por acompañarnos!</p>
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
