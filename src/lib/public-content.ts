import { createClient } from "@supabase/supabase-js";

import { getPublicEnvironment } from "@/lib/env";

export type PublicTreatment = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_pence: number;
  duration_minutes: number;
};

export type PublicProfile = {
  business_name: string;
  beautician_name: string;
  tagline: string;
  about_heading: string;
  about_body: string;
  contact_email: string;
  contact_phone: string;
  location: string;
};

export type PublicGalleryItem = {
  id: string;
  slug: string;
  imageUrl: string;
  altText: string;
  caption: string | null;
};

function publicClient() {
  const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment();
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function getPublicTreatments(): Promise<PublicTreatment[]> {
  const { data, error } = await publicClient()
    .from("treatments")
    .select("id, name, slug, description, price_pence, duration_minutes")
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to load treatments: ${error.message}`);
  return data;
}

export async function getPublicProfile(): Promise<PublicProfile> {
  const { data, error } = await publicClient()
    .from("business_profile")
    .select("business_name, beautician_name, tagline, about_heading, about_body, contact_email, contact_phone, location")
    .eq("id", true)
    .single();

  if (error) throw new Error(`Failed to load business profile: ${error.message}`);
  return data;
}

export async function getPublicGallery(): Promise<PublicGalleryItem[]> {
  const client = publicClient();
  const { data, error } = await client
    .from("gallery_items")
    .select("id, slug, storage_path, image_url, alt_text, caption")
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error) throw new Error(`Failed to load gallery: ${error.message}`);

  return data.flatMap((item) => {
    const imageUrl = item.image_url
      ?? (item.storage_path ? client.storage.from("gallery").getPublicUrl(item.storage_path).data.publicUrl : null);

    return imageUrl
      ? [{ id: item.id, slug: item.slug, imageUrl, altText: item.alt_text, caption: item.caption }]
      : [];
  });
}
