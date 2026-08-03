import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import AdminPage from "../app/admin/page";
import "../app/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminPage />
  </StrictMode>,
);
