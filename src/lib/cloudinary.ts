// Cloudinary helpers — upload uses signed requests from the server
// so we never expose the API secret to the client
import { createHash } from "crypto";

export type CloudinarySignatureResponse = {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  folder: string;
};

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
};

// ─── Client-side: compress image via canvas before upload ─────────────────────

export async function compressImage(
  file: File,
  maxWidth = 1200,
  quality = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");

      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas context unavailable"));

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };

    img.src = url;
  });
}

// ─── Client-side: upload a single file to Cloudinary ─────────────────────────

export async function uploadToCloudinary(
  file: File | Blob,
  folder: string,
  onProgress?: (percent: number) => void
): Promise<CloudinaryUploadResult> {
  // 1. Get signature from our API
  const sigRes = await fetch(`/api/upload?folder=${encodeURIComponent(folder)}`);
  if (!sigRes.ok) throw new Error("No se pudo obtener la firma de upload");
  const sig: CloudinarySignatureResponse = await sigRes.json();

  // 2. Build FormData for Cloudinary
  const formData = new FormData();
  formData.append("file", file);
  formData.append("signature", sig.signature);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("api_key", sig.apiKey);
  formData.append("folder", sig.folder);

  // 3. Upload via XMLHttpRequest (for progress tracking)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResult);
      } else {
        reject(new Error(`Upload fallido: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Error de red en upload")));

    xhr.open(
      "POST",
      `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`
    );
    xhr.send(formData);
  });
}

// ─── Server-side: generate Cloudinary signature ───────────────────────────────

export function generateCloudinarySignature(
  params: Record<string, string | number>
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");

  return createHash("sha256")
    .update(sortedParams + process.env.CLOUDINARY_API_SECRET!)
    .digest("hex");
}

// ─── Cloudinary URL transformations ──────────────────────────────────────────

export function cloudinaryUrl(
  publicIdOrUrl: string,
  transforms?: string
): string {
  if (publicIdOrUrl.startsWith("http")) return publicIdOrUrl;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const t = transforms ? `${transforms}/` : "";
  return `https://res.cloudinary.com/${cloudName}/image/upload/${t}${publicIdOrUrl}`;
}

export function cloudinaryThumb(url: string, width = 400): string {
  if (!url.includes("cloudinary.com")) return url;
  return url.replace("/upload/", `/upload/c_fill,w_${width},q_auto,f_auto/`);
}
