"use client";

import { useEffect } from "react";

type Props = {
  /** When true (admin), right-click / drag save stays enabled. */
  allowImageSave: boolean;
};

function isProtectedImageTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "img, picture, svg image, [data-protect-image], .protect-image",
    ),
  );
}

/**
 * Hardens casual image saving on the public site (context menu / drag).
 * Admins are exempt. Not a DRM — determined users can still capture images.
 */
export function ProtectPublicImages({ allowImageSave }: Props) {
  useEffect(() => {
    if (allowImageSave) {
      document.documentElement.classList.remove("protect-images");
      return;
    }

    document.documentElement.classList.add("protect-images");

    const onContextMenu = (e: MouseEvent) => {
      if (isProtectedImageTarget(e.target)) {
        e.preventDefault();
      }
    };

    const onDragStart = (e: DragEvent) => {
      if (isProtectedImageTarget(e.target)) {
        e.preventDefault();
      }
    };

    // Some browsers expose "Save image" via selectstart on images.
    const onSelectStart = (e: Event) => {
      if (isProtectedImageTarget(e.target)) {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu, true);
    document.addEventListener("dragstart", onDragStart, true);
    document.addEventListener("selectstart", onSelectStart, true);

    return () => {
      document.documentElement.classList.remove("protect-images");
      document.removeEventListener("contextmenu", onContextMenu, true);
      document.removeEventListener("dragstart", onDragStart, true);
      document.removeEventListener("selectstart", onSelectStart, true);
    };
  }, [allowImageSave]);

  return null;
}
