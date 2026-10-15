import type { Plan } from "./seating-planner";

export class PlanConflictError extends Error {}
type Save = (plan: Plan, version: number) => Promise<number>;
type State = { plan: Plan; dirty: boolean; saving: boolean; error: string; canUndo: boolean; canRedo: boolean };

/** Serializes autosaves; edits made during a request remain queued. */
export class PlanSession {
  private state: State;
  private listeners = new Set<() => void>();
  private past: Plan[] = [];
  private future: Plan[] = [];
  private version = 0;
  private revision = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private gesture = false;
  private gestureRecorded = false;
  private lastKey = "";
  private lastEdit = 0;
  private conflict = false;
  private active = true;
  private persist: Save;
  private delay: number;
  constructor(plan: Plan, persist: Save, delay = 700) {
    this.persist = persist; this.delay = delay;
    this.state = { plan, dirty: false, saving: false, error: "", canUndo: false, canRedo: false };
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private emit(patch: Partial<State>) {
    this.state = { ...this.state, ...patch, canUndo: this.past.length > 0, canRedo: this.future.length > 0 };
    this.listeners.forEach(fn => fn());
  }
  load(plan: Plan) {
    clearTimeout(this.timer); this.version = plan.version; this.past = []; this.future = []; this.revision = 0; this.conflict = false;
    this.emit({ plan, dirty: false, error: "" });
  }
  beginGesture() { this.gesture = true; this.gestureRecorded = false; clearTimeout(this.timer); }
  endGesture() { this.gesture = false; this.lastKey = ""; this.schedule(); }
  change(updater: (plan: Plan) => Plan, key = "") {
    const next = updater(this.state.plan);
    if (JSON.stringify(next) === JSON.stringify(this.state.plan)) return;
    const grouped = this.gesture ? this.gestureRecorded : key && key === this.lastKey && Date.now() - this.lastEdit < 900;
    if (!grouped) { this.past.push(this.state.plan); if (this.past.length > 60) this.past.shift(); }
    this.gestureRecorded = true; this.future = []; this.lastKey = key; this.lastEdit = Date.now();
    this.replace(next);
  }
  private replace(plan: Plan) {
    this.revision++;
    this.emit({ plan: { ...plan, version: this.version }, dirty: true }); this.schedule();
  }
  undo = () => {
    if (this.gesture || !this.past.length) return;
    this.future.push(this.state.plan); this.lastKey = ""; this.replace(this.past.pop()!);
  };
  redo = () => {
    if (this.gesture || !this.future.length) return;
    this.past.push(this.state.plan); this.lastKey = ""; this.replace(this.future.pop()!);
  };
  private schedule(delay = this.delay) {
    clearTimeout(this.timer);
    if (!this.active || !this.state.dirty || this.state.saving || this.gesture || this.conflict) return;
    this.timer = setTimeout(() => { void this.flush(); }, delay);
  }
  async flush() {
    if (!this.active || !this.state.dirty || this.state.saving || this.gesture || this.conflict) return;
    clearTimeout(this.timer);
    const revision = this.revision, snapshot = this.state.plan, expected = this.version;
    this.emit({ saving: true, error: "" });
    try {
      this.version = await this.persist(snapshot, expected);
      this.emit({ plan: { ...this.state.plan, version: this.version }, saving: false, dirty: this.revision !== revision });
      this.schedule();
    } catch (error) {
      this.conflict = error instanceof PlanConflictError;
      this.emit({ saving: false, error: this.conflict ? "El plano cambió en otra sesión. No reemplazamos esos cambios. Recargá para continuar; podés descargar tu plano antes." : "No se pudo guardar. Conservamos tus cambios en esta pestaña y reintentamos al recuperar la conexión." });
      this.schedule(5000);
    }
  }
  resume() { this.active = true; this.schedule(); }
  pause() { this.active = false; clearTimeout(this.timer); }
}
