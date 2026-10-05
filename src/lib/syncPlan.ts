// Pure two-way sync planning. No network or storage here, so it can be unit tested.
//
// Model: every folder / task / entry / plan / profile is a "record" identified by kind + id.
// The client keeps a snapshot: the JSON of each record as it was last agreed with the server.
//  - local JSON !== snapshot  → changed on this device (created, edited or deleted) → push it
//  - remote row arrives       → apply it, unless this device also changed that record
//  - both changed             → keep the local version (it gets pushed); profiles are merged
import { Entry, Folder, Plan, Profile, Task } from './types';

export type RecordKind = 'folder' | 'task' | 'entry' | 'plan' | 'profile';

export interface SyncData {
  folders: Folder[];
  tasks: Task[];
  entries: Entry[];
  plans: Plan[];
  profile: Profile;
}

export interface RemoteRecord {
  kind: RecordKind;
  id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
}

export interface PushRow {
  kind: RecordKind;
  id: string;
  data: unknown;
  deleted: boolean;
}

/** key -> canonical JSON as last agreed with the server */
export type Snapshot = Record<string, string>;

export const PROFILE_ID = 'me';

/** JSON with sorted keys and undefined dropped, so the same value always gives the same string (jsonb reorders keys). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value as object).sort()) {
      const v = (value as Record<string, unknown>)[k];
      if (v !== undefined) out[k] = sortDeep(v);
    }
    return out;
  }
  return value;
}

export function keyOf(kind: RecordKind, id: string): string {
  return `${kind}:${id}`;
}

export function splitKey(key: string): { kind: RecordKind; id: string } {
  const i = key.indexOf(':');
  return { kind: key.slice(0, i) as RecordKind, id: key.slice(i + 1) };
}

/** Flattens app data into key -> canonical JSON. */
export function toRecordMap(data: SyncData): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of data.folders) map.set(keyOf('folder', f.id), stableStringify(f));
  for (const t of data.tasks) map.set(keyOf('task', t.id), stableStringify(t));
  for (const e of data.entries) map.set(keyOf('entry', e.id), stableStringify(e));
  for (const p of data.plans) map.set(keyOf('plan', p.id), stableStringify(p));
  map.set(keyOf('profile', PROFILE_ID), stableStringify(data.profile));
  return map;
}

/** Rebuilds app data from a record map, in a stable display order. */
export function fromRecordMap(map: Map<string, string>, fallbackProfile: Profile): SyncData {
  const data: SyncData = { folders: [], tasks: [], entries: [], plans: [], profile: fallbackProfile };
  for (const [key, json] of map) {
    const { kind } = splitKey(key);
    const value = JSON.parse(json);
    if (kind === 'folder') data.folders.push(value);
    else if (kind === 'task') data.tasks.push(value);
    else if (kind === 'entry') data.entries.push(value);
    else if (kind === 'plan') data.plans.push(value);
    else if (kind === 'profile') data.profile = { ...fallbackProfile, ...value };
  }
  data.folders.sort((a, b) => a.createdAt - b.createdAt);
  data.tasks.sort((a, b) => a.createdAt - b.createdAt);
  data.entries.sort((a, b) => a.at - b.at);
  data.plans.sort((a, b) => a.createdAt - b.createdAt);
  return data;
}

/**
 * Combines two versions of the profile when both devices changed it.
 * Progress never goes backwards: keep the higher XP, Sparks and best streak, union achievements.
 */
export function mergeProfiles(local: Profile, remote: Profile): Profile {
  const newerStreak = (remote.streak?.lastDay ?? '') > (local.streak?.lastDay ?? '') ? remote.streak : local.streak;
  return {
    ...remote,
    ...local, // device settings: this device wins
    name: local.name?.trim() ? local.name : remote.name,
    xp: Math.max(local.xp, remote.xp),
    sparks: Math.max(local.sparks, remote.sparks),
    freezes: Math.max(local.freezes, remote.freezes),
    streak: { ...newerStreak, best: Math.max(local.streak?.best ?? 0, remote.streak?.best ?? 0) },
    achievements: { ...(remote.achievements ?? {}), ...(local.achievements ?? {}) },
    questDay: (remote.questDay ?? '') > (local.questDay ?? '') ? remote.questDay : local.questDay,
  };
}

export interface SyncPlan {
  /** Merged local records after applying remote changes. */
  local: Map<string, string>;
  /** Whether `local` differs from the input (the store needs updating). */
  localChanged: boolean;
  /** Rows to upsert to the server. */
  push: PushRow[];
  /** Snapshot to save once the push succeeds. */
  snapshot: Snapshot;
}

export function planSync(localIn: Map<string, string>, snapshotIn: Snapshot, remote: RemoteRecord[]): SyncPlan {
  const local = new Map(localIn);
  const snapshot: Snapshot = { ...snapshotIn };
  let localChanged = false;

  // Keep only the latest version of each remote record.
  const latest = new Map<string, RemoteRecord>();
  for (const r of remote) {
    const k = keyOf(r.kind, r.id);
    const prev = latest.get(k);
    if (!prev || r.updated_at >= prev.updated_at) latest.set(k, r);
  }

  // Pass 1: bring remote changes in.
  for (const [k, r] of latest) {
    const remoteJson = r.deleted || r.data == null ? undefined : stableStringify(r.data);
    const localJson = local.get(k);
    const changedHere = localJson !== snapshotIn[k];

    if (!changedHere) {
      if (remoteJson === undefined) {
        if (local.delete(k)) localChanged = true;
      } else if (localJson !== remoteJson) {
        local.set(k, remoteJson);
        localChanged = true;
      }
    } else if (r.kind === 'profile' && localJson && remoteJson) {
      const merged = stableStringify(mergeProfiles(JSON.parse(localJson), JSON.parse(remoteJson)));
      if (merged !== localJson) {
        local.set(k, merged);
        localChanged = true;
      }
    }
    // Otherwise both changed: keep local; it is pushed below.

    if (remoteJson === undefined) delete snapshot[k];
    else snapshot[k] = remoteJson;
  }

  // Pass 2: push everything that differs from what the server has.
  const push: PushRow[] = [];
  const keys = new Set([...local.keys(), ...Object.keys(snapshot)]);
  for (const k of keys) {
    const json = local.get(k);
    if (json === snapshot[k]) continue;
    const { kind, id } = splitKey(k);
    if (json === undefined) {
      push.push({ kind, id, data: null, deleted: true });
      delete snapshot[k];
    } else {
      push.push({ kind, id, data: JSON.parse(json), deleted: false });
      snapshot[k] = json;
    }
  }

  return { local, localChanged, push, snapshot };
}
