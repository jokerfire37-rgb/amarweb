export function describeCmsPermissionError(error?: { code?: string; message?: string } | null): string {
  const code = error?.code ?? "";
  const messageText = (error?.message ?? "").toLowerCase();

  if (code === "permission-denied" || messageText.includes("permission") || messageText.includes("insufficient permissions")) {
    return "Your admin session does not have permission to edit CMS content. Please sign out and sign in again.";
  }

  return error?.message || "Your admin session does not have permission to edit CMS content. Please sign out and sign in again.";
}

export function isSafeHttpUrl(value?: string | null): boolean {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function safeExternalHref(value?: string | null): string | undefined {
  return isSafeHttpUrl(value) ? value ?? undefined : undefined;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  return /^[0-9+\-()\s]{5,32}$/.test(value.trim());
}

export function validateFieldLength(value: string, maxLength: number): boolean {
  return value.length <= maxLength;
}

export function safeImageUrl(value?: string | null): string | undefined {
  return isSafeHttpUrl(value) ? value ?? undefined : undefined;
}

export function safeTelHref(value?: string | null): string | undefined {
  if (!value) return undefined;
  const phone = value.trim();
  return /^[+0-9][0-9+()\s-]{4,31}$/.test(phone) ? `tel:${phone.replace(/[^+\d]/g, "")}` : undefined;
}

export function safeMailtoHref(value?: string | null): string | undefined {
  return value && isValidEmail(value) ? `mailto:${value.trim()}` : undefined;
}

export function safeWhatsAppHref(value?: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && parsed.hostname === "wa.me" ? value : undefined;
  } catch {
    return undefined;
  }
}
