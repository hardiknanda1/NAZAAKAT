// Keeps the catalogue (open or closed, and which page) the same for everyone in a call.
//
// Anyone with the consultant link can open the catalogue or turn pages, and their screen re-sends its
// state every few seconds so a late joiner catches up. If two screens hold the consultant link (say
// the consultant and the admin, or an old tab left open), plain re-sending made them fight: the client
// flipped between "open" and "closed" every few seconds. So every real change gets a version number
// one higher than any version seen so far (a Lamport clock), and a screen only takes a state that is
// newer than the one it has. Re-sends carry the same version, so they can never undo a newer change.

export type SyncState = { page: number; show: boolean; v: number; from: string };

/** Message from another screen, or null if it isn't one of ours. */
export function parseSync(text: unknown, type: string): SyncState | null {
  try {
    const m = JSON.parse(String(text ?? ""));
    if (m?.type !== type || !Number.isInteger(m.page) || typeof m.show !== "boolean") return null;
    // Older screens sent no version: treat it as version 0, so it never beats a real change.
    const v = Number.isInteger(m.v) && m.v >= 0 ? m.v : 0;
    return { page: m.page, show: m.show, v, from: typeof m.from === "string" ? m.from.slice(0, 40) : "" };
  } catch {
    return null;
  }
}

/** True if the incoming state should replace ours (newer version; a tie is settled the same way everywhere). */
export const isNewer = (incoming: SyncState, ours: SyncState) => incoming.v > ours.v || (incoming.v === ours.v && incoming.from > ours.from);

/** Our state after we change something ourselves. */
export const localChange = (ours: SyncState, change: { page?: number; show?: boolean }, me: string): SyncState => ({
  page: change.page ?? ours.page,
  show: change.show ?? ours.show,
  v: ours.v + 1,
  from: me,
});

export const newScreenId = () => Math.random().toString(36).slice(2, 12);
