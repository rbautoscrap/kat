/** Nested-safe body scroll lock for mobile menus / modals. */

let lockCount = 0;
let saved: {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
  scrollY: number;
} | null = null;

export function lockBodyScroll() {
  if (typeof document === "undefined") return;

  if (lockCount === 0) {
    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const scrollbarGap = window.innerWidth - documentElement.clientWidth;
    saved = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      paddingRight: body.style.paddingRight,
      scrollY,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    if (scrollbarGap > 0) {
      body.style.paddingRight = `${scrollbarGap}px`;
    }
  }
  lockCount += 1;
}

export function unlockBodyScroll() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0 || !saved) return;

  const { body } = document;
  const { scrollY, ...styles } = saved;
  body.style.overflow = styles.overflow;
  body.style.position = styles.position;
  body.style.top = styles.top;
  body.style.width = styles.width;
  body.style.paddingRight = styles.paddingRight;
  saved = null;
  window.scrollTo(0, scrollY);
}
