import type { Metadata } from "next";

const SITE_NAME = "ספר בקליק";
const HOME_SITE_NAME = "حلاق بكبسة زر";
const HOME_DESCRIPTION = "احجز موعدك عند الحلاق بكبسة زر";
const OG_IMAGE_PATH = "/og-sefer-baklik.png";

function normalizeSiteUrl(raw: string) {
  let url = raw.trim().replace(/\/$/, "");
  // Collapse accidental https://https:// from misconfigured env
  while (/^https?:\/\/https?:\/\//i.test(url)) {
    url = url.replace(/^https?:\/\//i, "");
  }
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  return url;
}

export function getSiteUrl() {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "";
  if (fromEnv) return normalizeSiteUrl(fromEnv);
  return "https://sefer-baklik.onrender.com";
}

export function homeMetadata(): Metadata {
  const title = `${HOME_SITE_NAME} · حجز موعد عند الحلاق`;
  const description = HOME_DESCRIPTION;
  const url = getSiteUrl();
  const imageUrl = `${url}${OG_IMAGE_PATH}`;

  return {
    title: {
      default: title,
      template: `%s · ${HOME_SITE_NAME}`,
    },
    description,
    metadataBase: new URL(url),
    openGraph: {
      type: "website",
      locale: "ar_IL",
      siteName: HOME_SITE_NAME,
      title,
      description,
      url,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: `${HOME_SITE_NAME} — حجز موعد عند الحلاق`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export function barberShareMetadata(displayName: string, slug: string): Metadata {
  const title = `${SITE_NAME} · קביעת תור · ${displayName}`;
  const description = `קביעת תור אצל ${displayName} — דרך ${SITE_NAME}`;
  const url = `${getSiteUrl()}/${slug}`;
  const imageUrl = `${getSiteUrl()}${OG_IMAGE_PATH}`;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      locale: "he_IL",
      siteName: SITE_NAME,
      title,
      description,
      url,
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}
