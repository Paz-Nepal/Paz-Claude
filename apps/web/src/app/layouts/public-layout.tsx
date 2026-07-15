import { Outlet } from "react-router-dom";

/**
 * Minimal public layout for Phase 0. Header/nav/footer are Phase 1 work
 * (Publishing & Public Site) once there is published content to navigate to
 * — this exists now only so routing and the error boundary have somewhere
 * to render.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
