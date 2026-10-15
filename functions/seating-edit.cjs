class SeatingEditError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

/** Public collaborators can only patch coordinates and numbers of existing tables. */
function buildSeatingEdit(privatePlan, publicPlan, data) {
  const fail = (message) => { throw new SeatingEditError('invalid-argument', message); };
  if (!privatePlan || !publicPlan) throw new SeatingEditError('not-found', 'El plano no está disponible.');
  if (!data || Object.keys(data).some(key => !['version', 'changes'].includes(key)) || !Number.isInteger(data.version)) fail('Solicitud inválida.');
  if (privatePlan.version !== data.version || publicPlan.version !== data.version) throw new SeatingEditError('aborted', 'El plano cambió. Recargá para ver los últimos cambios.');
  if (!Array.isArray(data.changes) || !data.changes.length || data.changes.length > 100) fail('Indicá las mesas a modificar.');
  const patches = new Map();
  for (const change of data.changes) {
    if (!change || Object.keys(change).some(key => !['id', 'patch'].includes(key)) || typeof change.id !== 'string' || patches.has(change.id)) fail('Mesa inválida.');
    const item = privatePlan.items.find(item => item.id === change.id);
    const shared = publicPlan.items.find(item => item.id === change.id);
    if (!item || !shared || !['table', 'main'].includes(item.kind)) fail('Solo se pueden modificar mesas existentes.');
    const patch = change.patch;
    if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length || Object.keys(patch).some(key => !['x', 'y', 'number'].includes(key))) fail('Solo podés cambiar la posición y el número.');
    for (const key of ['x', 'y']) if (key in patch && (!Number.isFinite(patch[key]) || patch[key] < 0 || patch[key] > 100)) fail('Posición inválida.');
    if ('number' in patch && (!Number.isInteger(patch.number) || patch.number < 1 || patch.number > 999)) fail('El número debe estar entre 1 y 999.');
    patches.set(change.id, patch);
  }
  const version = data.version + 1, updated_at = new Date().toISOString();
  const update = plan => ({ ...plan, version, updated_at, items: plan.items.map(item => patches.has(item.id) ? { ...item, ...patches.get(item.id) } : item) });
  return { privatePlan: update(privatePlan), publicPlan: update(publicPlan), version };
}

module.exports = { buildSeatingEdit, SeatingEditError };
