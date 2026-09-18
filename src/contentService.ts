import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { firebaseAuth, firebaseDb, isFirebaseConfigured } from "./firebase";
import { isSafeHttpUrl, safeImageUrl } from "./utils/security";

export type HeroContent = {
  heading: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  imageUrl: string;
  storagePath?: string;
};

export type AboutContent = {
  heading: string;
  description: string;
  imageUrl: string;
  storagePath?: string;
};

export type WhyChooseItem = {
  id?: string;
  title: string;
  description: string;
  icon?: string;
};

export type WhyChooseContent = {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  storagePath?: string;
  items: WhyChooseItem[];
};

export type ServiceContent = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  storagePath?: string;
};

export type GalleryContent = {
  id?: string;
  title: string;
  category: string;
  imageUrl: string;
  storagePath?: string;
};

export type OfferContent = {
  id?: string;
  title: string;
  description: string;
  imageUrl: string;
  storagePath?: string;
  active: boolean;
};

export type TestimonialContent = {
  id?: string;
  name: string;
  review: string;
  rating: number;
  imageUrl?: string;
  storagePath?: string;
};

export type ContactDetails = {
  businessName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  googleMapsUrl: string;
  workingHours: string;
};

export type SiteSettingsContent = {
  businessName: string;
  tagline: string;
  copyright: string;
  themeColor: string;
};

export type SiteLogoContent = {
  id?: string;
  imageUrl: string;
  title?: string;
};

export type SeoSettings = {
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  ogImage: string;
  canonicalUrl: string;
};

export type SocialLinks = {
  facebook: string;
  instagram: string;
  whatsapp: string;
  youtube: string;
  linkedin: string;
};

export type EnquiryRecord = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  service: string;
  message: string;
  quantity?: string;
  completed?: boolean;
  createdAt?: unknown;
};

const DEFAULT_HERO: HeroContent = {
  heading: "Professional Printing Services in Bantwal & Mangalore",
  subtitle: "From business cards and brochures to banners, stickers, wedding cards, packaging, and custom printing, Amar Printers delivers premium quality, creative designs, and fast turnaround across Bantwal and Mangalore.",
  ctaText: "Get a Free Quote",
  ctaLink: "#contact",
  imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=600&fit=crop&q=85",
};

const DEFAULT_ABOUT: AboutContent = {
  heading: "Your Trusted Printing Partner in Bantwal & Mangalore",
  description: "Amar Printers is a trusted printing company based in Kaikamba, Bantwal, proudly serving customers across Bantwal, Mangalore, and nearby areas.",
  imageUrl: "https://images.pexels.com/photos/13061615/pexels-photo-13061615.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
};

const DEFAULT_WHY_CHOOSE: WhyChooseContent = {
  title: "Why Businesses Choose Amar Printers",
  subtitle: "WHY CHOOSE US",
  description: "We combine creativity, technology, and quality craftsmanship to deliver printing solutions that exceed expectations.",
  imageUrl: "https://images.pexels.com/photos/13061615/pexels-photo-13061615.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1400",
  items: [
    {
      title: "Premium Print Quality",
      description: "Delivering sharp colors, premium finishes, and exceptional print clarity.",
    },
    {
      title: "Fast Turnaround",
      description: "Timely completion and delivery without compromising quality.",
    },
    {
      title: "Creative Design Support",
      description: "Professional graphic design assistance for every project.",
    },
    {
      title: "Affordable Pricing",
      description: "Competitive pricing with outstanding value.",
    },
    {
      title: "Advanced Printing Technology",
      description: "Modern equipment ensuring precision and consistency.",
    },
    {
      title: "Trusted Local Partner",
      description: "Serving businesses, schools, institutions, and individuals across Bantwal and Mangalore.",
    },
  ],
};

const DEFAULT_CONTACT: ContactDetails = {
  businessName: "Amar Printers",
  phone: "+91 94824 86971",
  whatsapp: "+91 94824 86971",
  email: "apbctroad@gmail.com",
  address: "Polali Cross Road, Kaikamba, B.C. Road, Bantwal, D.K. - 574219",
  googleMapsUrl: "https://maps.google.com/?q=Amar+Printers+Kaikamba+Bantwal",
  workingHours: "Mon – Sat · 9:00 AM – 7:00 PM\nSunday · 10:00 AM – 2:00 PM",
};

const DEFAULT_SEO: SeoSettings = {
  metaTitle: "Amar Printers | Professional Printing Services in Bantwal & Mangalore",
  metaDescription: "Amar Printers offers premium printing services in Bantwal and Mangalore, including business cards, brochures, banners, wedding cards, packaging, and custom printing.",
  keywords: "printing services, business cards, brochures, banners, wedding cards, Bantwal, Mangalore",
  ogImage: "https://images.pexels.com/photos/37394506/pexels-photo-37394506.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=2200",
  canonicalUrl: "https://amarprinters.com",
};

const DEFAULT_SOCIAL: SocialLinks = {
  facebook: "https://www.facebook.com/amarprinters",
  instagram: "https://www.instagram.com/amarprinters",
  whatsapp: "https://wa.me/919482486971",
  youtube: "",
  linkedin: "",
};

const DEFAULT_SITE_SETTINGS: SiteSettingsContent = {
  businessName: "Amar Printers",
  tagline: "Professional Printing Services in Bantwal & Mangalore",
  copyright: "© 2026 Amar Printers. All Rights Reserved.",
  themeColor: "#e63946",
};

const DEFAULT_SITE_LOGO: SiteLogoContent = {
  imageUrl: "",
  title: "Amar Printers",
};

function sanitizeFirestoreData<T extends Record<string, unknown>>(payload: T) {
  return Object.entries(payload).reduce<Record<string, unknown>>((accumulator, [key, value]) => {
    if (value !== undefined) {
      accumulator[key] = value;
    }
    return accumulator;
  }, {});
}

async function uploadImageToCloudinary(file: File) {
  // Client-side safety checks: restrict mime types and maximum file size
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
  const maxSize = 5 * 1024 * 1024; // 5 MB
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Unsupported file type. Allowed types: jpg, png, webp, gif, svg.");
  }
  if (file.size > maxSize) {
    throw new Error("File is too large. Maximum allowed size is 5 MB.");
  }

  const signingUrl = import.meta.env.VITE_CLOUDINARY_SIGNING_URL;
  const currentUser = firebaseAuth?.currentUser;
  if (!signingUrl || !isSafeHttpUrl(signingUrl) || !currentUser) {
    throw new Error("Secure image upload is not configured.");
  }

  const formatByMimeType: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  };
  const format = formatByMimeType[file.type];
  const token = await currentUser.getIdToken();
  const signingResponse = await fetch(signingUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  });
  const signingPayload = await signingResponse.json().catch(() => ({} as { signature?: string; timestamp?: number; apiKey?: string; cloudName?: string; folder?: string }));
  if (!signingResponse.ok || !signingPayload.signature || !signingPayload.timestamp || !signingPayload.apiKey || !signingPayload.cloudName) {
    throw new Error("Secure image upload is unavailable.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", signingPayload.apiKey);
  formData.append("timestamp", String(signingPayload.timestamp));
  formData.append("signature", signingPayload.signature);
  if (signingPayload.folder) formData.append("folder", signingPayload.folder);
  formData.append("format", format);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(signingPayload.cloudName)}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const payload = await response.json().catch(() => ({} as { secure_url?: string; error?: { message?: string } }));
  const imageUrl = safeImageUrl(payload.secure_url);
  if (!response.ok || !imageUrl) {
    throw new Error(response.ok ? "Image upload failed." : payload.error?.message || "Image upload failed.");
  }

  return { imageUrl };
}

async function uploadGalleryImageToCloudinary(file: File) {
  return uploadImageToCloudinary(file);
}

export async function requireAdminWriteAccess() {
  const currentUser = firebaseAuth?.currentUser;
  if (!currentUser) {
    throw new Error("Your admin session does not have permission to edit CMS content. Please sign out and sign in again.");
  }

  const { claims } = await currentUser.getIdTokenResult(true);
  if (claims.admin !== true) {
    throw new Error("Your admin session does not have permission to edit CMS content. Please sign out and sign in again.");
  }
}

export async function deleteImageFromStorage(_storagePath?: string) {
  return undefined;
}

export async function saveHeroContent(payload: HeroContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  await setDoc(doc(firebaseDb, "hero", "main"), sanitizeFirestoreData(nextPayload), { merge: true });
  return nextPayload;
}

export async function saveAboutContent(payload: AboutContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  await setDoc(doc(firebaseDb, "about", "main"), sanitizeFirestoreData(nextPayload), { merge: true });
  return nextPayload;
}

export async function saveWhyChooseContent(payload: WhyChooseContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  await setDoc(doc(firebaseDb, "whyChoose", "main"), sanitizeFirestoreData(nextPayload), { merge: true });
  return nextPayload;
}

export async function saveServiceContent(payload: ServiceContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  const { id, ...restPayload } = nextPayload;
  const sanitizedPayload = sanitizeFirestoreData(restPayload);

  if (payload.id) {
    await updateDoc(doc(firebaseDb, "services", payload.id), sanitizedPayload);
  } else {
    const firebaseDoc = await addDoc(collection(firebaseDb, "services"), {
      ...sanitizedPayload,
      createdAt: serverTimestamp(),
    });
    nextPayload.id = firebaseDoc.id;
  }

  return nextPayload;
}

export async function deleteServiceContent(id?: string, storagePath?: string) {
  if (!firebaseDb || !isFirebaseConfigured || !id) return;
  await requireAdminWriteAccess();
  await deleteDoc(doc(firebaseDb, "services", id));
  await deleteImageFromStorage(storagePath);
}

export async function saveGalleryContent(payload: GalleryContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadGalleryImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  const { id, ...restPayload } = nextPayload;
  const sanitizedPayload = sanitizeFirestoreData(restPayload);

  if (payload.id) {
    await updateDoc(doc(firebaseDb, "gallery", payload.id), sanitizedPayload);
  } else {
    const firebaseDoc = await addDoc(collection(firebaseDb, "gallery"), {
      ...sanitizedPayload,
      createdAt: serverTimestamp(),
    });
    nextPayload.id = firebaseDoc.id;
  }

  return nextPayload;
}

export async function deleteGalleryContent(id?: string, storagePath?: string) {
  if (!firebaseDb || !isFirebaseConfigured || !id) return;
  await requireAdminWriteAccess();
  await deleteDoc(doc(firebaseDb, "gallery", id));
  await deleteImageFromStorage(storagePath);
}

export async function saveOfferContent(payload: OfferContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  const { id, ...restPayload } = nextPayload;
  const sanitizedPayload = sanitizeFirestoreData(restPayload);

  if (payload.id) {
    await updateDoc(doc(firebaseDb, "offers", payload.id), sanitizedPayload);
  } else {
    const firebaseDoc = await addDoc(collection(firebaseDb, "offers"), {
      ...sanitizedPayload,
      createdAt: serverTimestamp(),
    });
    nextPayload.id = firebaseDoc.id;
  }

  return nextPayload;
}

export async function deleteOfferContent(id?: string, storagePath?: string) {
  if (!firebaseDb || !isFirebaseConfigured || !id) return;
  await requireAdminWriteAccess();
  await deleteDoc(doc(firebaseDb, "offers", id));
  await deleteImageFromStorage(storagePath);
}

export async function saveTestimonialContent(payload: TestimonialContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
    delete nextPayload.storagePath;
  }

  const { id, ...restPayload } = nextPayload;
  const sanitizedPayload = sanitizeFirestoreData(restPayload);

  if (payload.id) {
    await updateDoc(doc(firebaseDb, "testimonials", payload.id), sanitizedPayload);
  } else {
    const firebaseDoc = await addDoc(collection(firebaseDb, "testimonials"), {
      ...sanitizedPayload,
      createdAt: serverTimestamp(),
    });
    nextPayload.id = firebaseDoc.id;
  }

  return nextPayload;
}

export async function deleteTestimonialContent(id?: string, storagePath?: string) {
  if (!firebaseDb || !isFirebaseConfigured || !id) return;
  await requireAdminWriteAccess();
  await deleteDoc(doc(firebaseDb, "testimonials", id));
  await deleteImageFromStorage(storagePath);
}

export async function saveContactDetails(payload: ContactDetails) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  await setDoc(doc(firebaseDb, "settings", "contact"), sanitizeFirestoreData(payload), { merge: true });
  return payload;
}

export async function saveSiteSettings(payload: SiteSettingsContent) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  await setDoc(doc(firebaseDb, "settings", "site"), sanitizeFirestoreData(payload), { merge: true });
  return payload;
}

export async function saveSiteLogo(payload: SiteLogoContent, file?: File) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  const nextPayload = { ...payload };
  if (file) {
    const uploaded = await uploadImageToCloudinary(file);
    nextPayload.imageUrl = uploaded.imageUrl;
  }

  await setDoc(doc(firebaseDb, "settings", "logo"), sanitizeFirestoreData(nextPayload), { merge: true });
  return nextPayload;
}

export async function saveSeoSettings(payload: SeoSettings) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  await setDoc(doc(firebaseDb, "seo", "main"), sanitizeFirestoreData(payload), { merge: true });
  return payload;
}

export async function saveSocialLinks(payload: SocialLinks) {
  if (!firebaseDb || !isFirebaseConfigured) return payload;
  await requireAdminWriteAccess();
  await setDoc(doc(firebaseDb, "socialLinks", "main"), sanitizeFirestoreData(payload), { merge: true });
  return payload;
}

export async function updateEnquiryStatus(id: string, completed: boolean) {
  if (!firebaseDb || !isFirebaseConfigured || !id) return;
  await requireAdminWriteAccess();
  await updateDoc(doc(firebaseDb, "enquiries", id), { completed });
}

export async function deleteEnquiry(id: string) {
  if (!firebaseDb || !isFirebaseConfigured || !id) return;
  await requireAdminWriteAccess();
  await deleteDoc(doc(firebaseDb, "enquiries", id));
}

export async function loadSiteContent(includeEnquiries = false) {
  if (!firebaseDb || !isFirebaseConfigured) {
    const message = "Firebase database is not configured.";
    console.error("[CMS] loadSiteContent failed", { code: "firebase-not-configured", message });
    throw new Error(message);
  }

  try {
    const [heroSnap, aboutSnap, whyChooseSnap, contactSnap, siteSettingsSnap, logoSnap, seoSnap, socialSnap, servicesSnap, gallerySnap, offersSnap, testimonialsSnap] = await Promise.all([
      getDoc(doc(firebaseDb, "hero", "main")),
      getDoc(doc(firebaseDb, "about", "main")),
      getDoc(doc(firebaseDb, "whyChoose", "main")),
      getDoc(doc(firebaseDb, "settings", "contact")),
      getDoc(doc(firebaseDb, "settings", "site")),
      getDoc(doc(firebaseDb, "settings", "logo")),
      getDoc(doc(firebaseDb, "seo", "main")),
      getDoc(doc(firebaseDb, "socialLinks", "main")),
      getDocs(query(collection(firebaseDb, "services"), orderBy("title", "asc"))),
      getDocs(query(collection(firebaseDb, "gallery"), orderBy("createdAt", "desc"))),
      getDocs(query(collection(firebaseDb, "offers"), orderBy("createdAt", "desc"))),
      getDocs(collection(firebaseDb, "testimonials")),
    ]);
    const enquiriesSnap = includeEnquiries
      ? await getDocs(query(collection(firebaseDb, "enquiries"), orderBy("createdAt", "desc")))
      : null;

    const testimonialDocs = [...testimonialsSnap.docs].sort((left, right) => {
      const leftCreatedAt = left.data().createdAt;
      const rightCreatedAt = right.data().createdAt;
      const leftTime = leftCreatedAt && typeof leftCreatedAt === "object" && "toMillis" in leftCreatedAt && typeof leftCreatedAt.toMillis === "function" ? leftCreatedAt.toMillis() : 0;
      const rightTime = rightCreatedAt && typeof rightCreatedAt === "object" && "toMillis" in rightCreatedAt && typeof rightCreatedAt.toMillis === "function" ? rightCreatedAt.toMillis() : 0;
      return rightTime - leftTime;
    });
    console.info(`[CMS] Testimonials loaded: ${testimonialDocs.length} documents`);

    return {
      hero: heroSnap.exists() ? ({ ...DEFAULT_HERO, ...(heroSnap.data() as Partial<HeroContent>) }) : DEFAULT_HERO,
      about: aboutSnap.exists() ? ({ ...DEFAULT_ABOUT, ...(aboutSnap.data() as Partial<AboutContent>) }) : DEFAULT_ABOUT,
      whyChoose: whyChooseSnap.exists()
        ? (() => {
          const whyChoose = { ...DEFAULT_WHY_CHOOSE, ...(whyChooseSnap.data() as Partial<WhyChooseContent>) };
          return { ...whyChoose, description: whyChoose.description.trim() || DEFAULT_WHY_CHOOSE.description };
        })()
        : DEFAULT_WHY_CHOOSE,
      contact: contactSnap.exists() ? ({ ...DEFAULT_CONTACT, ...(contactSnap.data() as Partial<ContactDetails>) }) : DEFAULT_CONTACT,
      settings: siteSettingsSnap.exists() ? ({ ...DEFAULT_SITE_SETTINGS, ...(siteSettingsSnap.data() as Partial<SiteSettingsContent>) }) : DEFAULT_SITE_SETTINGS,
      logo: logoSnap.exists() ? ({ ...DEFAULT_SITE_LOGO, ...(logoSnap.data() as Partial<SiteLogoContent>) }) : DEFAULT_SITE_LOGO,
      seo: seoSnap.exists() ? ({ ...DEFAULT_SEO, ...(seoSnap.data() as Partial<SeoSettings>) }) : DEFAULT_SEO,
      social: socialSnap.exists() ? ({ ...DEFAULT_SOCIAL, ...(socialSnap.data() as Partial<SocialLinks>) }) : DEFAULT_SOCIAL,
      services: servicesSnap.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as ServiceContent) })),
      gallery: gallerySnap.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as GalleryContent) })),
      offers: offersSnap.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as OfferContent) })),
      testimonials: testimonialDocs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as TestimonialContent) })),
      enquiries: enquiriesSnap ? enquiriesSnap.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...(docSnapshot.data() as EnquiryRecord) })) : [],
    };
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string } | null;
    console.error("[CMS] loadSiteContent failed", {
      code: firebaseError?.code ?? "unknown",
      message: firebaseError?.message ?? "Unknown Firestore read error",
    });
    throw error;
  }
}

export const defaultHeroContent = DEFAULT_HERO;
export const defaultAboutContent = DEFAULT_ABOUT;
export const defaultWhyChooseContent = DEFAULT_WHY_CHOOSE;
export const defaultContactDetails = DEFAULT_CONTACT;
export const defaultSiteSettings = DEFAULT_SITE_SETTINGS;
export const defaultSiteLogo = DEFAULT_SITE_LOGO;
export const defaultSeoSettings = DEFAULT_SEO;
export const defaultSocialLinks = DEFAULT_SOCIAL;
