// Plus tier rules (pure). What is free and what Plus unlocks.
export const FREE_FOLDER_LIMIT = 3;

export interface Entitlement {
  plan: string;
  expires_at?: string | null;
}

/** Is this server entitlement an active Plus subscription right now? */
export function isPlusActive(ent: Entitlement | null | undefined, now: number = Date.now()): boolean {
  if (!ent || ent.plan !== 'plus') return false;
  if (!ent.expires_at) return true;
  const t = Date.parse(ent.expires_at);
  return Number.isFinite(t) && t > now;
}

export function canCreateFolder(folderCount: number, plus: boolean): boolean {
  return plus || folderCount < FREE_FOLDER_LIMIT;
}
