import { createClient } from "@supabase/supabase-js";

import { getPublicEnvironment, hasPublicEnvironment } from "@/lib/env";

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

const fallbackTreatments: PublicTreatment[] = [
  {
    id: "signature-brow-sculpt",
    name: "Signature Brow Sculpt",
    slug: "signature-brow-sculpt",
    description: "A tailored brow tidy, shape, and finish designed to frame your features.",
    price_pence: 3500,
    duration_minutes: 45,
  },
  {
    id: "lash-lift",
    name: "Lash Lift",
    slug: "lash-lift",
    description: "A softly lifted, defined look for effortlessly polished lashes.",
    price_pence: 4500,
    duration_minutes: 60,
  },
  {
    id: "skin-reset-facial",
    name: "Skin Reset Facial",
    slug: "skin-reset-facial",
    description: "A restorative facial ritual to cleanse, replenish, and leave skin luminous.",
    price_pence: 6500,
    duration_minutes: 75,
  },
  {
    id: "express-dermaplane",
    name: "Express Dermaplane",
    slug: "express-dermaplane",
    description: "A precise exfoliating treatment for a smoother, brighter-looking finish.",
    price_pence: 5000,
    duration_minutes: 45,
  },
];

const fallbackProfile: PublicProfile = {
  business_name: "Sculpted by Ruby",
  beautician_name: "Ruby",
  tagline: "Beauty, thoughtfully tailored.",
  about_heading: "A little ritual, just for you.",
  about_body: "Sculpted by Ruby is a calm, considered space for modern beauty treatments shaped around you.",
  contact_email: "hello@sculptedbyruby.example",
  contact_phone: "Contact details coming soon",
  location: "United Kingdom",
};

const fallbackGallery: PublicGalleryItem[] = [
  {
    id: "soft-light",
    slug: "soft-light",
    imageUrl: "/gallery/placeholder-01.svg",
    altText: "Soft neutral beauty studio detail",
    caption: "The quiet details matter.",
  },
  {
    id: "warm-ritual",
    slug: "warm-ritual",
    imageUrl: "/gallery/placeholder-02.svg",
    altText: "Warm taupe beauty treatment detail",
    caption: "Time set aside for you.",
  },
  {
    id: "quiet-finish",
    slug: "quiet-finish",
    imageUrl: "/gallery/placeholder-03.svg",
    altText: "Minimal sculptural beauty detail",
    caption: "Modern beauty, still your own.",
  },
];

function publicClient() {
  if (!hasPublicEnvironment()) return null;

  const { supabaseUrl, supabasePublishableKey } = getPublicEnvironment();
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function getPublicTreatments() {
  const client = publicClient();
  if (!client) return fallbackTreatments;

  const { data, error } = await client
    .from("treatments")
    .select("id, name, slug, description, price_pence, duration_minutes")
    .eq("active", true)
    .order("display_order", { ascending: true });

  return error || !data?.length ? fallbackTreatments : data;
}

export async function getPublicProfile() {
  const client = publicClient();
  if (!client) return fallbackProfile;

  const { data, error } = await client
    .from("business_profile")
    .select("business_name, beautician_name, tagline, about_heading, about_body, contact_email, contact_phone, location")
    .eq("id", true)
    .maybeSingle();

  return error || !data ? fallbackProfile : { ...fallbackProfile, ...data };
}

export async function getPublicGallery() {
  const client = publicClient();
  if (!client) return fallbackGallery;

  const { data, error } = await client
    .from("gallery_items")
    .select("id, slug, storage_path, image_url, alt_text, caption")
    .eq("published", true)
    .order("display_order", { ascending: true });

  if (error || !data?.length) return fallbackGallery;

  const items = data
    .map((item) => {
      const imageUrl = item.image_url ?? (item.storage_path
        ? client.storage.from("gallery").getPublicUrl(item.storage_path).data.publicUrl
        : null);

      if (!imageUrl) return null;
      return {
        id: item.id,
        slug: item.slug,
        imageUrl,
        altText: item.alt_text,
        caption: item.caption,
      };
    })
    .filter((item): item is PublicGalleryItem => item !== null);

  return items.length ? items : fallbackGallery;
}
