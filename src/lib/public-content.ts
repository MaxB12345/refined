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
    id: "intro-facial",
    name: "Intro Facial",
    slug: "intro-facial",
    description:
      "Perfect for new clients. Not sure which treatment is right for your skin? Our Intro Facial is the perfect place to start. This appointment allows extra time for a detailed consultation and skin analysis, where we can discuss your skin concerns, current skincare routine and treatment goals. Following your consultation, we'll create a personalised treatment plan and select the most appropriate treatment, or combination of treatments, for your skin on the day. Ideal for first-time clients or anyone who would like professional guidance before beginning a regular treatment plan.",
    price_pence: 5000,
    duration_minutes: 75,
  },
  {
    id: "microneedling",
    name: "Microneedling",
    slug: "microneedling",
    description:
      "Skin renewal, fine lines, texture. Microneedling is a skin-renewing treatment designed to improve the appearance of fine lines, uneven texture and overall skin quality. It works by creating controlled micro-channels in the skin, encouraging the skin's natural renewal process. Your treatment can be tailored to your individual skin concerns and goals.",
    price_pence: 6500,
    duration_minutes: 60,
  },
  {
    id: "dermaplaning",
    name: "Dermaplaning",
    slug: "dermaplaning",
    description:
      "Smooth, fresh, glowing. Dermaplaning gently exfoliates the surface of the skin, removing dead skin cells and fine facial hair. This leaves the skin feeling exceptionally smooth and looking brighter and more refreshed. A great option for anyone wanting a fresh, glowing complexion and beautifully smooth skin.",
    price_pence: 4500,
    duration_minutes: 60,
  },
  {
    id: "chemical-peel",
    name: "Chemical Peel",
    slug: "chemical-peel",
    description:
      "Acne, scarring, fine lines, pigmentation. Chemical peels use carefully selected exfoliating solutions to encourage skin renewal and improve the appearance of congestion, acne, post-acne marks, pigmentation, uneven texture and fine lines. The type and strength of peel will be selected according to your individual skin type, concerns and treatment goals. A consultation may be required before treatment.",
    price_pence: 5500,
    duration_minutes: 60,
  },
  {
    id: "high-frequency",
    name: "High Frequency",
    slug: "high-frequency",
    description:
      "Congestion, blemish-prone skin, skin purification. High Frequency is a targeted treatment designed to support congested and blemish-prone skin. It can be used as a standalone treatment or incorporated into a personalised facial. Your treatment will be adapted to your skin's individual needs.",
    price_pence: 4500,
    duration_minutes: 60,
  },
  {
    id: "hydra-facial",
    name: "Hydra Facial",
    slug: "hydra-facial",
    description:
      "Deep cleanse, hydration, glow. A refreshing treatment designed to cleanse, exfoliate and hydrate the skin, leaving your complexion looking fresh, smooth and revitalised. Ideal for congested, dull or dehydrated-looking skin and perfect when you want a refreshed, glowing appearance.",
    price_pence: 4500,
    duration_minutes: 60,
  },
  {
    id: "luxury-facial",
    name: "Luxury Facial",
    slug: "luxury-facial",
    description:
      "Relaxation, skin refresh, personalised care. A relaxing and personalised facial designed to leave your skin feeling refreshed, nourished and revitalised. Your treatment can include cleansing, exfoliation, massage, a personalised mask and finishing skincare, depending on your skin's individual needs.",
    price_pence: 4000,
    duration_minutes: 45,
  },
  {
    id: "led-facial",
    name: "LED Facial",
    slug: "led-facial",
    description:
      "Sensitive skin, skin support, preparation. A gentle, non-invasive treatment using LED light therapy to support the skin and promote a healthy-looking complexion. Particularly suitable for sensitive skin, LED can be enjoyed as a standalone treatment or incorporated into other facial treatments as part of a personalised skincare plan.",
    price_pence: 3500,
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
