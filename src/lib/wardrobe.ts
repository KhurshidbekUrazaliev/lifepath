// Wardrobe catalog (placeholder items; the real art arrives with the commissioned Echo in 1.0).
// Every item is drawn procedurally by components/EchoAvatar.tsx from its id and colors.
export type Slot = 'top' | 'hat' | 'accessory' | 'backdrop';

export interface Item {
  id: string;
  slot: Slot;
  name: string;
  price: number; // Sparks; 0 = everyone owns it
  color: string;
  color2?: string; // second color (gradients, trims)
  minStage?: number; // stage index needed to buy (see STAGES in lib/echo.ts)
}

export const SLOTS: { id: Slot; label: string; icon: string }[] = [
  { id: 'top', label: 'Tops', icon: '👕' },
  { id: 'hat', label: 'Hats', icon: '🧢' },
  { id: 'accessory', label: 'Extras', icon: '🕶️' },
  { id: 'backdrop', label: 'Scenes', icon: '🌅' },
];

export const ITEMS: Item[] = [
  // Tops
  { id: 'top-tee', slot: 'top', name: 'Everyday tee', price: 0, color: '#8B82FF' },
  { id: 'top-hoodie', slot: 'top', name: 'Cozy hoodie', price: 40, color: '#FF8A5B', color2: '#E86B3C' },
  { id: 'top-bomber', slot: 'top', name: 'Bomber jacket', price: 90, color: '#2F6F5E', color2: '#E8E1C8' },
  { id: 'top-kimono', slot: 'top', name: 'Kimono', price: 160, color: '#B8324F', color2: '#F3D9A4' },
  { id: 'top-cloak', slot: 'top', name: 'Starlit cloak', price: 260, color: '#2A2A66', color2: '#F6D86B', minStage: 2 },
  // Hats
  { id: 'hat-none', slot: 'hat', name: 'No hat', price: 0, color: '#000000' },
  { id: 'hat-cap', slot: 'hat', name: 'Sport cap', price: 30, color: '#3B82F6', color2: '#1E4FA8' },
  { id: 'hat-beanie', slot: 'hat', name: 'Winter beanie', price: 30, color: '#E5484D', color2: '#F5F5F5' },
  { id: 'hat-band', slot: 'hat', name: 'Focus headband', price: 50, color: '#F59E0B' },
  { id: 'hat-wizard', slot: 'hat', name: 'Wizard hat', price: 200, color: '#5B4FE9', color2: '#F6D86B', minStage: 2 },
  { id: 'hat-crown', slot: 'hat', name: 'Golden crown', price: 400, color: '#F6C945', color2: '#E0A91B', minStage: 4 },
  // Extras
  { id: 'acc-none', slot: 'accessory', name: 'Nothing', price: 0, color: '#000000' },
  { id: 'acc-glasses', slot: 'accessory', name: 'Round glasses', price: 40, color: '#2B2437' },
  { id: 'acc-scarf', slot: 'accessory', name: 'Warm scarf', price: 60, color: '#E5484D', color2: '#F5F5F5' },
  { id: 'acc-headphones', slot: 'accessory', name: 'Headphones', price: 80, color: '#16151A', color2: '#5B4FE9' },
  { id: 'acc-wings', slot: 'accessory', name: 'Spirit wings', price: 300, color: '#FFFFFF', color2: '#C9C2FF', minStage: 3 },
  // Scenes
  { id: 'bg-none', slot: 'backdrop', name: 'Soft glow', price: 0, color: '#8B82FF' },
  { id: 'bg-dawn', slot: 'backdrop', name: 'Dawn', price: 20, color: '#FFD3A5', color2: '#FD6585' },
  { id: 'bg-forest', slot: 'backdrop', name: 'Forest', price: 60, color: '#9BE7B5', color2: '#2F8F6B' },
  { id: 'bg-night', slot: 'backdrop', name: 'Night sky', price: 100, color: '#4B3F9E', color2: '#12102E' },
  { id: 'bg-sakura', slot: 'backdrop', name: 'Sakura', price: 150, color: '#FFD6E6', color2: '#F58CB5' },
  { id: 'bg-aurora', slot: 'backdrop', name: 'Aurora', price: 300, color: '#5EEAD4', color2: '#7C3AED', minStage: 3 },
];

export const itemById = (id: string | undefined): Item | undefined => ITEMS.find((i) => i.id === id);

export const DEFAULT_OUTFIT: Record<Slot, string> = {
  top: 'top-tee',
  hat: 'hat-none',
  accessory: 'acc-none',
  backdrop: 'bg-none',
};

export type Outfit = Partial<Record<Slot, string>>;

// ---------- Owning and buying ----------

/**
 * Sparks you can spend. `profile.sparks` is everything ever earned and only grows; what you have bought
 * is the sum of the prices of the items you own, so two devices that each buy something merge correctly.
 */
export function sparkBalance(profile: { sparks: number; owned?: string[] }): number {
  const spent = (profile.owned ?? []).reduce((sum, id) => sum + (itemById(id)?.price ?? 0), 0);
  return Math.max(0, profile.sparks - spent);
}

export const isOwned = (profile: { owned?: string[] }, item: Item): boolean =>
  item.price === 0 || (profile.owned ?? []).includes(item.id);

export type BuyCheck = { ok: true } | { ok: false; reason: 'owned' | 'poor' | 'stage' | 'unknown' };

export function canBuy(profile: { sparks: number; owned?: string[] }, itemId: string, stageIndex: number): BuyCheck {
  const item = itemById(itemId);
  if (!item) return { ok: false, reason: 'unknown' };
  if (isOwned(profile, item)) return { ok: false, reason: 'owned' };
  if ((item.minStage ?? 0) > stageIndex) return { ok: false, reason: 'stage' };
  if (sparkBalance(profile) < item.price) return { ok: false, reason: 'poor' };
  return { ok: true };
}
