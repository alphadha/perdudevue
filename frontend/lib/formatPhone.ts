/** Affichage Figma : `00 00 00 00 00`. */
export function formatPhoneFr(phone: string | null | undefined): string {
  if (!phone) {
    return "";
  }
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 0) {
    return phone;
  }
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}
