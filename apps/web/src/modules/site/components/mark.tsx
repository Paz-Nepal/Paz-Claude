/**
 * The house's mark, drawn once and referenced everywhere (Build Programme
 * 15). The geometric bird is not drawn yet, so `apps/web/public/mark.svg`
 * does not exist and every slot below renders nothing. Slots are absent
 * rather than filled: a placeholder mark is the wax fruit in its purest
 * form. The day the drawing exists, adding that one file gives the whole
 * site its mark: the tab icon, the seal line on a Sattal piece, the struck
 * row on a hallmarked work, the certificate, and the deposit entry.
 */
declare const __MARK__: boolean;

export const MARK_AVAILABLE = typeof __MARK__ !== "undefined" && __MARK__;

export function Mark({ size = 20, className }: { size?: number; className?: string }) {
  if (!MARK_AVAILABLE) return null;
  return (
    <img
      src="/mark.svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={className}
    />
  );
}
