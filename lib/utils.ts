import { SupabaseClient } from "@supabase/supabase-js";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD") // Supprime les accents
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "") // Supprime les caractères spéciaux
    .trim()
    .replace(/\s+/g, "-") // Remplace les espaces par des tirets
    .replace(/-+/g, "-"); // Supprime les tirets multiples
}

export async function getUniqueSlug(
  supabase: SupabaseClient,
  baseSlug: string,
  table: string = "opportunities",
): Promise<string> {
  let slug = baseSlug;
  let count = 1;
  while (true) {
    const { data } = await supabase
      .from(table)
      .select("slug")
      .eq("slug", slug)
      .single();
    if (!data) break;
    slug = `${baseSlug}-${count++}`;
  }
  return slug;
}

// Helper pour les initiales des avatars
export const getInitials = (firstName?: string, lastName?: string, email?: string) => {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  return email?.slice(0, 2).toUpperCase() || "??";
};

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 o";
  const k = 1024;
  const sizes = ["o", "Ko", "Mo", "Go"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}