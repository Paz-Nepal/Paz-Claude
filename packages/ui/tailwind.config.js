import pazPreset from "@paz/config/tailwind.preset.js";

/** @type {import('tailwindcss').Config} */
export default {
  presets: [pazPreset],
  content: ["./src/**/*.{ts,tsx}", "./.ladle/**/*.{ts,tsx}"],
};
