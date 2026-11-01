/**
 * Compresses an image file on client-side using HTML5 Canvas
 * Targets < 500KB and reasonable dimensions (max 1280px)
 * Converts directly to Base64 in memory without Supabase Storage usage.
 */
export async function compressImageToBase64(
  file: File,
  maxDimension = 1200,
  targetQuality = 0.75
): Promise<{ base64: string; mimeType: string; sizeKb: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Resize down if larger than maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas 2D context"));
          return;
        }

        // Fill white background for potential transparent PNGs
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to JPEG with compression quality
        const mimeType = "image/jpeg";
        const base64DataUrl = canvas.toDataURL(mimeType, targetQuality);

        // Calculate size in KB
        const stringLength = base64DataUrl.length - "data:image/jpeg;base64,".length;
        const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.562489633438312;
        const sizeKb = Math.round(sizeInBytes / 1024);

        resolve({
          base64: base64DataUrl,
          mimeType,
          sizeKb,
        });
      };

      img.onerror = () => reject(new Error("Failed to load image into DOM"));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
