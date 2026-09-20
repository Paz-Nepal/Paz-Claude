#!/usr/bin/env node
// Removes apps/web/dist before a publishing build. The build tool may
// replay a cached copy of its own output, which would leave pages from an
// earlier publish (say, one since archived) sitting in dist/ to be
// uploaded again. The static site is rebuilt from nothing every time.
import { rmSync } from "node:fs";

rmSync("apps/web/dist", { recursive: true, force: true });
console.log("Cleared apps/web/dist.");
