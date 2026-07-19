import "server-only";
import sharp, { type OverlayOptions } from "sharp";
import type { Line, Worker, Word } from "tesseract.js";

export type PlateBlurResult = {
  buffer: Buffer;
  platesFound: number;
};

type Box = { left: number; top: number; width: number; height: number };

/** Korean plate-like text (e.g. 45서9835, 12가3456, 서울12가3456). */
const PLATE_TEXT_RE =
  /(?:[가-힣]{1,4})?\d{2,3}\s*[가-힣]\s*\d{4}/;

/** Digits-heavy OCR noise that still looks like a plate fragment. */
const LOOSE_PLATE_RE = /\d{2,3}\s*[가-힣A-Za-z]\s*\d{3,4}/;

let workerPromise: Promise<Worker> | null = null;
let ocrQueue: Promise<unknown> = Promise.resolve();

function plateBlurEnabled() {
  const flag = process.env.PLATE_AUTO_BLUR?.trim().toLowerCase();
  if (flag === "0" || flag === "false" || flag === "off") return false;
  return true;
}

function enqueueOcr<T>(fn: () => Promise<T>): Promise<T> {
  const run = ocrQueue.then(fn, fn);
  ocrQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const { createWorker, PSM } = await import("tesseract.js");
      const worker = await createWorker("kor+eng", 1, {
        logger: () => {},
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SPARSE_TEXT, // sparse text — plates anywhere in frame
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

function normalizeOcrText(raw: string) {
  return raw.replace(/[\s·・‧.]/g, "").trim();
}

function looksLikePlate(text: string) {
  const compact = normalizeOcrText(text);
  if (compact.length < 6 || compact.length > 14) return false;
  if (PLATE_TEXT_RE.test(text) || PLATE_TEXT_RE.test(compact)) return true;
  if (LOOSE_PLATE_RE.test(text) || LOOSE_PLATE_RE.test(compact)) return true;
  // 2–3 digits + hangul + 4 digits with OCR gaps removed
  return /^\d{2,3}[가-힣]\d{4}$/.test(compact);
}

function expandBox(box: Box, imgW: number, imgH: number, padRatio: number): Box {
  const padX = Math.max(4, Math.round(box.width * padRatio));
  const padY = Math.max(4, Math.round(box.height * padRatio));
  const left = Math.max(0, box.left - padX);
  const top = Math.max(0, box.top - padY);
  const right = Math.min(imgW, box.left + box.width + padX);
  const bottom = Math.min(imgH, box.top + box.height + padY);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  };
}

function mergeBoxes(boxes: Box[]): Box[] {
  if (boxes.length <= 1) return boxes;
  const sorted = [...boxes].sort((a, b) => a.left - b.left || a.top - b.top);
  const out: Box[] = [];
  for (const box of sorted) {
    const prev = out[out.length - 1];
    if (!prev) {
      out.push({ ...box });
      continue;
    }
    const overlap =
      box.left <= prev.left + prev.width + 8 &&
      box.top <= prev.top + prev.height + 8 &&
      prev.left <= box.left + box.width + 8 &&
      prev.top <= box.top + box.height + 8;
    if (overlap) {
      const left = Math.min(prev.left, box.left);
      const top = Math.min(prev.top, box.top);
      const right = Math.max(prev.left + prev.width, box.left + box.width);
      const bottom = Math.max(prev.top + prev.height, box.top + box.height);
      prev.left = left;
      prev.top = top;
      prev.width = right - left;
      prev.height = bottom - top;
    } else {
      out.push({ ...box });
    }
  }
  return out;
}

function collectOcrWords(page: { blocks: { paragraphs: { lines: Line[] }[] }[] | null }): Word[] {
  const words: Word[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      for (const line of para.lines ?? []) {
        words.push(...(line.words ?? []));
      }
    }
  }
  return words;
}

function collectOcrLines(page: { blocks: { paragraphs: { lines: Line[] }[] }[] | null }): Line[] {
  const lines: Line[] = [];
  for (const block of page.blocks ?? []) {
    for (const para of block.paragraphs ?? []) {
      lines.push(...(para.lines ?? []));
    }
  }
  return lines;
}

async function detectPlateBoxes(jpeg: Buffer): Promise<Box[]> {
  const meta = await sharp(jpeg).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 40 || height < 40) return [];

  const OCR_MAX_EDGE = 1280;
  const scale = Math.min(1, OCR_MAX_EDGE / Math.max(width, height));
  const ocrW = Math.max(1, Math.round(width * scale));
  const ocrH = Math.max(1, Math.round(height * scale));

  const ocrInput = await sharp(jpeg)
    .resize({ width: ocrW, height: ocrH, fit: "fill" })
    .grayscale()
    .normalize()
    .sharpen()
    .png()
    .toBuffer();

  const boxes = await enqueueOcr(async () => {
    const worker = await getWorker();
    const result = await worker.recognize(ocrInput, {}, { text: true, blocks: true });
    const words = collectOcrWords(result.data);
    const found: Box[] = [];

    for (const word of words) {
      const text = (word.text || "").trim();
      if (!text || !looksLikePlate(text)) continue;
      const conf = typeof word.confidence === "number" ? word.confidence : 0;
      if (conf > 0 && conf < 35) continue;

      const b = word.bbox;
      if (!b) continue;
      const left = b.x0 / scale;
      const top = b.y0 / scale;
      const w = (b.x1 - b.x0) / scale;
      const h = (b.y1 - b.y0) / scale;
      if (w < 20 || h < 10) continue;
      const aspect = w / h;
      if (aspect < 1.2 || aspect > 8) continue;

      found.push(
        expandBox(
          {
            left,
            top,
            width: w,
            height: h,
          },
          width,
          height,
          0.18,
        ),
      );
    }

    // Line-level fallback (OCR sometimes groups the whole plate as one line)
    for (const line of collectOcrLines(result.data)) {
      const text = (line.text || "").trim();
      if (!looksLikePlate(text)) continue;
      const b = line.bbox;
      if (!b) continue;
      found.push(
        expandBox(
          {
            left: b.x0 / scale,
            top: b.y0 / scale,
            width: (b.x1 - b.x0) / scale,
            height: (b.y1 - b.y0) / scale,
          },
          width,
          height,
          0.15,
        ),
      );
    }

    return mergeBoxes(found);
  });

  return boxes;
}

async function mosaicRegions(input: Buffer, regions: Box[]): Promise<Buffer> {
  if (regions.length === 0) return input;

  const meta = await sharp(input).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (!width || !height) return input;

  const composites: OverlayOptions[] = [];

  for (const region of regions) {
    const left = Math.max(0, Math.min(width - 1, Math.floor(region.left)));
    const top = Math.max(0, Math.min(height - 1, Math.floor(region.top)));
    const w = Math.max(1, Math.min(width - left, Math.ceil(region.width)));
    const h = Math.max(1, Math.min(height - top, Math.ceil(region.height)));
    if (w < 6 || h < 6) continue;

    const block = Math.max(4, Math.round(Math.min(w, h) / 10));
    const mosaic = await sharp(input)
      .extract({ left, top, width: w, height: h })
      .resize({
        width: Math.max(2, Math.floor(w / block)),
        height: Math.max(2, Math.floor(h / block)),
        kernel: "nearest",
      })
      .resize(w, h, { kernel: "nearest" })
      .toBuffer();

    composites.push({ input: mosaic, left, top });
  }

  if (composites.length === 0) return input;

  return sharp(input)
    .composite(composites)
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}

const PLATE_BLUR_TIMEOUT_MS = 12_000;

/**
 * Detect Korean-style license plates anywhere in the frame and pixelate them.
 * Runs entirely on-server (no third-party image upload). Best-effort — not 100%.
 */
export async function blurLicensePlates(input: Buffer): Promise<PlateBlurResult> {
  if (!plateBlurEnabled()) {
    return { buffer: input, platesFound: 0 };
  }

  try {
    const work = (async (): Promise<PlateBlurResult> => {
      const boxes = await detectPlateBoxes(input);
      if (boxes.length === 0) {
        return { buffer: input, platesFound: 0 };
      }
      const buffer = await mosaicRegions(input, boxes);
      return { buffer, platesFound: boxes.length };
    })();

    const result = await Promise.race([
      work,
      new Promise<PlateBlurResult>((resolve) =>
        setTimeout(() => {
          console.warn("[plate-blur] timed out — skipping mosaic");
          resolve({ buffer: input, platesFound: 0 });
        }, PLATE_BLUR_TIMEOUT_MS),
      ),
    ]);
    return result;
  } catch (error) {
    console.error("[plate-blur] failed; uploading original compressed image", error);
    return { buffer: input, platesFound: 0 };
  }
}
