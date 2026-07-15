import pazPreset from "@paz/config/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [pazPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
};
