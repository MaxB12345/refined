type PublicEnvironment = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
};

function required(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getPublicEnvironment(): PublicEnvironment {
  return {
    supabaseUrl: required(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      "NEXT_PUBLIC_SUPABASE_URL",
    ),
    supabasePublishableKey: required(
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sculptedbyruby.example",
  };
}

export function hasPublicEnvironment() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
