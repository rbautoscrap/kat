"use client";

import { createRoot } from "react-dom/client";
import type { InventoryListRow } from "@/lib/inventory-list-types";

export const SHIPPING_MARK_BRAND = "KOREA AUTO TRADE";
export const CHUNGJU_SHIPPING_STREET =
  "충북 충주시 대소원면 산정독정길 143";
export const CHUNGJU_SHIPPING_COMPANY = "알비오토";
export const CHUNGJU_SHIPPING_ADDRESS = `${CHUNGJU_SHIPPING_STREET} ${CHUNGJU_SHIPPING_COMPANY}`;

const EXPORT_WIDTH_PX = 1600;

function waitFrames(count: number) {
  return new Promise<void>((resolve) => {
    const step = (left: number) => {
      if (left <= 0) {
        resolve();
        return;
      }
      requestAnimationFrame(() => step(left - 1));
    };
    step(count);
  });
}

function displayValue(value: string) {
  const trimmed = value.trim();
  return trimmed && trimmed !== "-" ? trimmed : "—";
}

function shippingMarkFilename(row: InventoryListRow) {
  const key = (row.vehicleNumber || row.vin || row.id)
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `KAT-충주쉬핑마크-${key}.png`;
}

export function ShippingMarkSheet({
  title,
  vin,
  vehicleNumber,
}: {
  title: string;
  vin: string;
  vehicleNumber: string;
}) {
  return (
    <div className="shipping-mark-sheet">
      <p className="shipping-mark-brand">{SHIPPING_MARK_BRAND}</p>
      <dl className="shipping-mark-fields">
        <div>
          <dt>모델명</dt>
          <dd>{displayValue(title)}</dd>
        </div>
        <div>
          <dt>VIN</dt>
          <dd className="is-code">{displayValue(vin)}</dd>
        </div>
        <div>
          <dt>차량번호</dt>
          <dd className="is-code">{displayValue(vehicleNumber)}</dd>
        </div>
        <div>
          <dt>도착지</dt>
          <dd className="is-dest">
            {CHUNGJU_SHIPPING_STREET}
            <strong>{CHUNGJU_SHIPPING_COMPANY}</strong>
          </dd>
        </div>
      </dl>
    </div>
  );
}

export async function downloadShippingMarkPng(row: InventoryListRow) {
  const { toPng } = await import("html-to-image");
  await document.fonts.ready.catch(() => undefined);

  const layer = document.createElement("div");
  layer.setAttribute("data-shipping-mark-export-layer", "1");
  Object.assign(layer.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: `${EXPORT_WIDTH_PX}px`,
    zIndex: "2147483646",
    background: "#ffffff",
    pointerEvents: "none",
    opacity: "1",
  });
  document.body.appendChild(layer);

  const root = createRoot(layer);
  root.render(
    <ShippingMarkSheet
      title={row.title}
      vin={row.vin}
      vehicleNumber={row.vehicleNumber}
    />,
  );

  try {
    await waitFrames(3);
    await new Promise((r) => setTimeout(r, 80));

    const node = layer.querySelector(".shipping-mark-sheet");
    if (!(node instanceof HTMLElement)) {
      throw new Error("shipping mark node missing");
    }

    const height = Math.max(node.scrollHeight, node.offsetHeight, 980);
    const dataUrl = await toPng(node, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      width: EXPORT_WIDTH_PX,
      height,
      style: {
        width: `${EXPORT_WIDTH_PX}px`,
        maxWidth: `${EXPORT_WIDTH_PX}px`,
        transform: "none",
        opacity: "1",
      },
    });

    if (!dataUrl || dataUrl.length < 200) {
      throw new Error("empty image data");
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = shippingMarkFilename(row);
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    root.unmount();
    layer.remove();
  }
}
