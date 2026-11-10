import type { ShippingLabelFile, ShopPair } from "@/lib/types";

export const PAIR_CREATED_TOAST = {
  title: "Paire enregistrée",
  message: "La paire de lunettes a bien été ajoutée à votre espace.",
} as const;

export type EngraveFormat = "svg" | "png" | "jpg" | "dxf";

export function downloadAssignedCode(pair: ShopPair): void {
  void exportAssignedCodes([pair], "svg");
}

export async function exportAssignedCodes(pairs: ShopPair[], format: EngraveFormat): Promise<void> {
  for (const pair of pairs) {
    await exportAssignedCode(pair.assigned_code, format);
  }
}

async function exportAssignedCode(code: string, format: EngraveFormat): Promise<void> {
  const filename = `code-assigne-${code}.${format === "jpg" ? "jpg" : format}`;
  if (format === "svg") {
    triggerDownload(filename, new Blob([svgForCode(code)], { type: "image/svg+xml;charset=utf-8" }));
    return;
  }
  if (format === "dxf") {
    triggerDownload(filename, new Blob([dxfForCode(code)], { type: "image/vnd.dxf;charset=utf-8" }));
    return;
  }
  const blob = await rasterForCode(code, format);
  triggerDownload(filename, blob);
}

function svgForCode(code: string): string {
  const escaped = code.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="12mm" height="1.5mm" viewBox="0 0 120 15">
  <text x="60" y="12.2" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-size="11" font-weight="700" fill="#13263F">${escaped}</text>
</svg>`;
}

function dxfForCode(code: string): string {
  return `0\nSECTION\n2\nENTITIES\n0\nTEXT\n8\n0\n10\n0.0\n20\n0.0\n30\n0.0\n40\n1.5\n1\n${code}\n0\nENDSEC\n0\nEOF\n`;
}

function rasterForCode(code: string, format: "png" | "jpg"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const svg = svgForCode(code);
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round((12 / 25.4) * 300);
      canvas.height = Math.round((1.5 / 25.4) * 300);
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(url);
        reject(new Error("Canvas indisponible."));
        return;
      }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
            return;
          }
          reject(new Error("Export impossible."));
        },
        format === "jpg" ? "image/jpeg" : "image/png",
        1,
      );
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Export impossible."));
    };
    image.src = url;
  });
}

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  triggerDownload(filename, blob);
}

export function downloadLabelFile(file: ShippingLabelFile): void {
  const encoding = file.encoding ?? (file.filename.toLowerCase().endsWith(".pdf") ? "base64" : "plain");
  if (encoding === "base64") {
    const binary = atob(file.content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: file.mime ?? "application/pdf" });
    triggerDownload(file.filename, blob);
    return;
  }

  downloadTextFile(file.filename, file.content);
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function clientDisplayName(pair: ShopPair): string {
  if (!pair.client) {
    return "";
  }
  return `${pair.client.first_name} ${pair.client.last_name}`;
}
