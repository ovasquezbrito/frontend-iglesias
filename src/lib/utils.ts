import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import axios from "axios";
import type { ChurchKidMetadata } from "@/types/church";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error inesperado"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; error?: string } | undefined;
    if (data?.message) return data.message;
    if (data?.error) return data.error;
    if (!error.response) return "Sin conexión con el servidor";
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export function isNetworkError(error: unknown): boolean {
  if (!navigator.onLine) return true;
  if (axios.isAxiosError(error) && !error.response) return true;
  return false;
}

/**
 * Formats Venezuelan or international phone numbers for WhatsApp wa.me links.
 * Converts 04XX... -> 584XX...
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0") && digits.length === 11) {
    return `58${digits.slice(1)}`;
  }
  if (digits.length === 10 && digits.startsWith("4")) {
    return `58${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const clean = formatWhatsAppPhone(phone);
  if (!clean) return "";
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function generateKidsSecurityCode(existingCodes: Set<string> = new Set()): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const num = Math.floor(100 + Math.random() * 900);
    const code = `K-${num}`;
    if (!existingCodes.has(code)) return code;
  }
  return `K-${Date.now().toString().slice(-4)}`;
}

export function parseKidMetadata(metadataJson?: string): ChurchKidMetadata {
  if (!metadataJson) return {};
  try {
    const parsed = JSON.parse(metadataJson) as ChurchKidMetadata;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function formatMoney(amount: number, currency: string): string {
  const formatted = Number(amount || 0).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency} ${formatted}`;
}

export function todayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
