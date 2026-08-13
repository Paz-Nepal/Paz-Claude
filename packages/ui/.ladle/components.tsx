import type { GlobalProvider } from "@ladle/react";
import "./globals.css";

/** `<main>`, not a plain `<div>`: axe-core's "region" rule (every
 * story is its own standalone page as far as axe is concerned) fails
 * otherwise — content not contained by a landmark. */
export const Provider: GlobalProvider = ({ children }) => <main className="p-6">{children}</main>;
