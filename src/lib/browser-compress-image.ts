/** Browser-side resize/compress before upload — cuts multipart + server /tmp pressure. */

const MAX_EDGE = 1920;
const JPEG_QUALITY = 0.82;
const SKIP_UNDER_BYTES = 450_000;

function isCompressibleImage(file: File) {
  if (!file.type.startsWith("image/")) return false;
  // Keep GIF as-is (animation). HEIC often fails in canvas.
  if (file.type === "image/gif") return false;
  if (file.type === "image/heic" || file.type === "image/heif") return false;
  return true;
}

export async function compressImageForUpload(file: File): Promise<File> {
  if (!isCompressibleImage(file) || file.size <= SKIP_UNDER_BYTES) {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "photo";
    return new File([blob], `${base}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export async function compressImagesForUpload(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<File[]> {
  const out: File[] = [];
  for (let i = 0; i < files.length; i++) {
    out.push(await compressImageForUpload(files[i]!));
    onProgress?.(i + 1, files.length);
  }
  return out;
}
