"use client";
/* Standalone GitHub Pages entry: navigation must use ordinary document links. */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { firebaseAuth } from "../firebase";
import { SeatingPlanner } from "../admin/seating-planner";
import "./mesas.css";

export default function TablesPage() {
  const [access, setAccess] = useState<"loading" | "public" | "editor" | "login">("loading");
  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, user => {
      if (!new URLSearchParams(window.location.search).has("editar")) setAccess("public");
      else setAccess(user?.uid === "VgGQEYLf2qdcQkMm389U5RDygED3" ? "editor" : "login");
    });
  }, []);
  return <main className="tables-page">
    <nav className="tables-nav" aria-label="Navegación"><a href="/">M<span>&</span>G</a><span>PLANO DEL SALÓN</span><a href={access === "editor" ? "/mesas/" : "/admin/"}>{access === "editor" ? "Ver enlace público ↗" : "Administrar"}</a></nav>
    {access === "loading" ? <p className="tables-access" role="status">Cargando…</p> : access === "login" ? <div className="tables-access"><h1>Editar el salón</h1><p>Iniciá sesión en el admin y abrí «Organizar mesas».</p><a href="/admin/">Ir al admin</a><a href="/mesas/">Abrir el plano compartido</a></div> : <SeatingPlanner rsvps={[]} sharedEdit={access === "public"} />}
  </main>;
}
