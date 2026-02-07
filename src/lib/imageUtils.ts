/**
 * Image Utilities - Client-side image resizing and compression
 * 
 * This module provides utilities for resizing and compressing images
 * on the client side before uploading to the backend.
 */

/**
 * Compress and convert image to JPEG format
 * Converts any image format (including HEIC/HEIF from mobile devices) to JPEG
 * with specified max dimensions and quality.
 * 
 * @param file - Original image file (can be HEIC, PNG, JPEG, etc.)
 * @param options - Compression options
 * @returns Promise<File> - New File object with JPEG MIME type
 */
export async function compressImageToJpeg(
  file: File,
  options?: { maxWidth?: number; maxHeight?: number; quality?: number }
): Promise<File> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.8 } = options || {};

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Oranı bozmadan yeniden boyutlandır
        if (width > maxWidth || height > maxHeight) {
          const widthRatio = maxWidth / width;
          const heightRatio = maxHeight / height;
          const ratio = Math.min(widthRatio, heightRatio);

          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas context alınamadı"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Görsel sıkıştırılamadı"));
              return;
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^.]+$/, "") + ".jpg",
              { type: "image/jpeg" }
            );

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };

      img.onerror = (err) => {
        reject(new Error(`Görsel yüklenemedi: ${err}`));
      };
      img.src = reader.result as string;
    };

    reader.onerror = (err) => {
      reject(new Error(`Dosya okunamadı: ${err}`));
    };
    reader.readAsDataURL(file);
  });
}

export async function resizeImageFile(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.8
): Promise<Blob> {
  const image = await readFileToImage(file);
  const { width, height } = getScaledSize(image.width, image.height, maxWidth, maxHeight);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context not available");
  }

  ctx.drawImage(image, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });
}

async function readFileToImage(file: File): Promise<HTMLImageElement> {
  const dataUrl = await fileToDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

function getScaledSize(
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // Calculate scaling factors for both dimensions
  const widthScale = maxWidth / origWidth;
  const heightScale = maxHeight / origHeight;
  
  // Use the smaller scale to ensure both dimensions fit within limits
  const scale = Math.min(widthScale, heightScale, 1); // Don't scale up (max scale = 1)
  
  return {
    width: Math.round(origWidth * scale),
    height: Math.round(origHeight * scale),
  };
}
