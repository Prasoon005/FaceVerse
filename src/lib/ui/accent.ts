/** User-selectable accent colours (user portal). Stored per device in localStorage. */
export const ACCENT_KEY = "faceverse-accent";

export const ACCENTS = [
  { id: "blue", label: "Blue", swatch: ["#2a8cff", "#0058c4"] },
  { id: "purple", label: "Purple", swatch: ["#c77dff", "#8944ab"] },
  { id: "teal", label: "Teal", swatch: ["#40c8e0", "#0e7c86"] },
  { id: "green", label: "Green", swatch: ["#30d158", "#1f7a34"] },
  { id: "pink", label: "Pink", swatch: ["#ff6482", "#d6194b"] },
  { id: "orange", label: "Orange", swatch: ["#ffb340", "#c45500"] },
  { id: "graphite", label: "Graphite", swatch: ["#aeaeb2", "#3a3a3c"] },
] as const;

export type Accent = (typeof ACCENTS)[number]["id"];

export function applyAccent(accent: Accent) {
  const root = document.documentElement;
  if (accent === "blue") delete root.dataset.accent;
  else root.dataset.accent = accent;
  try {
    if (accent === "blue") localStorage.removeItem(ACCENT_KEY);
    else localStorage.setItem(ACCENT_KEY, accent);
  } catch {
    // Storage blocked: the colour still applies for this visit.
  }
  window.dispatchEvent(new Event("faceverse:accent"));
}

/** Inline script for <head>: applies the saved accent before first paint (no flash). */
export const accentBootScript = `try{var a=localStorage.getItem("${ACCENT_KEY}");if(a&&/^[a-z]+$/.test(a))document.documentElement.dataset.accent=a}catch(e){}`;
