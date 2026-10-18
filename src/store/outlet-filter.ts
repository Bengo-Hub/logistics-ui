import { create } from 'zustand';

export interface OutletOption {
  id: string;
  code: string;
  name: string;
  useCase?: string;
  isHq?: boolean;
}

/** localStorage key of the chosen outlet: an outlet id, or ALL_OUTLETS for the whole business. */
export const SELECTED_OUTLET_KEY = 'logistics-selected-outlet-id';
export const ALL_OUTLETS = 'all';

function readStoredSelection(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(SELECTED_OUTLET_KEY);
  } catch {
    return null;
  }
}

function persistSelection(outlet: OutletOption | null) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SELECTED_OUTLET_KEY, outlet?.id ?? ALL_OUTLETS);
  } catch {
    /* private mode: the choice just does not survive a reload */
  }
}

/**
 * The outlet to open on once the tenant's outlets are known: the one the user chose last,
 * else the main outlet (is_hq), else the first. "All branches" is only ever a deliberate
 * choice, never the starting point, so deliveries and areas open scoped to one outlet.
 */
export function pickDefaultOutlet(outlets: OutletOption[], stored: string | null): OutletOption | null {
  if (outlets.length === 0) return null;
  if (stored === ALL_OUTLETS) return null;
  return outlets.find((o) => o.id === stored) ?? outlets.find((o) => o.isHq) ?? outlets[0];
}

interface OutletFilterState {
  /** Selected outlet for drill-down. null = "All Branches". */
  selectedOutlet: OutletOption | null;
  /** All outlets of this tenant, loaded from auth-api for the header switcher. */
  outlets: OutletOption[];

  /** Stores the tenant's outlets and, on first load, preselects the user's last or the main outlet. */
  setOutlets: (outlets: OutletOption[]) => void;
  /** The one switch action every switcher calls; remembers the choice across reloads. */
  selectOutlet: (outlet: OutletOption | null) => void;
  clearOutlet: () => void;
  /** UUID string ready for X-Outlet-ID header. Empty string when no drill-down. */
  outletIdHeader: () => string;
}

export const useOutletFilterStore = create<OutletFilterState>((set, get) => ({
  selectedOutlet: null,
  outlets: [],

  setOutlets: (outlets) => {
    // Keep the choice the user already made this session (including "All Branches"); only
    // the first load applies the stored or default outlet.
    const firstLoad = get().outlets.length === 0;
    const current = get().selectedOutlet;
    const stored = readStoredSelection();
    let selected = current;
    if (firstLoad && !(current && current.name)) {
      selected = pickDefaultOutlet(outlets, stored);
    } else if (current) {
      // Fill the name and code of an outlet restored by id, or drop one that no longer exists.
      selected = outlets.find((o) => o.id === current.id) ?? pickDefaultOutlet(outlets, null);
    }
    set({ outlets, selectedOutlet: selected });
    if (selected && selected.id !== stored) persistSelection(selected);
  },

  selectOutlet: (outlet) => {
    set({ selectedOutlet: outlet });
    persistSelection(outlet);
  },

  clearOutlet: () => {
    set({ selectedOutlet: null });
    persistSelection(null);
  },

  outletIdHeader: () => get().selectedOutlet?.id ?? '',
}));
