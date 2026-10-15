import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import TablesPage from "../app/mesas/page";
import "../app/mesas/mesas.css";

createRoot(document.getElementById("root")!).render(<StrictMode><TablesPage /></StrictMode>);
