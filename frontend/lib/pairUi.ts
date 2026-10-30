import type { ShippingLabelFile, ShopPair } from "@/lib/types";

export const PAIR_CREATED_TOAST = {
  title: "Paire enregistrée",
  message: "La paire de lunettes a bien été ajoutée à votre espace.",
} as const;

export function downloadAssignedCode(pair: ShopPair): void {
  downloadTextFile(`code-assigne-${pair.assigned_code}.txt`, pair.assigned_code);
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
  return `${pair.client.last_name} ${pair.client.first_name}`;
}
