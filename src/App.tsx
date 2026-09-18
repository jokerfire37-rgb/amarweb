import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { browserSessionPersistence, onIdTokenChanged, setPersistence, signInWithEmailAndPassword, signOut, type User } from "firebase/auth";
import type { LucideIcon } from "lucide-react";
import {
  ArrowUpRight,
  Award,
  BadgeCheck,
  BookOpen,
  BriefcaseBusiness,
  CakeSlice,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  Gift,
  HeartHandshake,
  LayoutTemplate,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Palette,
  Phone,
  Printer,
  QrCode,
  Scissors,
  Send,
  ShieldCheck,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { FormEvent } from "react";
import {
  firebaseAuth,
  isFirebaseConfigured,
} from "./firebase";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import {
  loadSiteContent,
  type AboutContent,
  type ContactDetails,
  type EnquiryRecord,
  type GalleryContent,
  type HeroContent,
  type OfferContent,
  type SeoSettings,
  type ServiceContent,
  type SiteLogoContent,
  type SiteSettingsContent,
  type SocialLinks,
  type TestimonialContent,
  type WhyChooseContent,
} from "./contentService";
import { isSafeHttpUrl, safeExternalHref, safeImageUrl, safeMailtoHref, safeTelHref, safeWhatsAppHref } from "./utils/security";

type GoogleReview = {
  name: string;
  rating: number;
  review: string;
  date: string;
  verified: boolean;
  initials: string;
};

type SiteContentState = {
  hero: HeroContent;
  about: AboutContent;
  whyChoose: WhyChooseContent;
  services: ServiceContent[];
  gallery: GalleryContent[];
  offers: OfferContent[];
  testimonials: TestimonialContent[];
  contact: ContactDetails;
  settings: SiteSettingsContent;
  logo: SiteLogoContent;
  seo: SeoSettings;
  social: SocialLinks;
  enquiries: EnquiryRecord[];
};

// Neutral empty site content used at initial render to avoid showing stale or hardcoded marketing copy
const EMPTY_SITE_CONTENT: SiteContentState = {
  hero: { heading: "", subtitle: "", ctaText: "", ctaLink: "", imageUrl: "" },
  about: { heading: "", description: "", imageUrl: "" },
  whyChoose: { title: "", subtitle: "", description: "", imageUrl: "", items: [] },
  services: [],
  gallery: [],
  offers: [],
  testimonials: [],
  contact: { businessName: "", phone: "", whatsapp: "", email: "", address: "", googleMapsUrl: "", workingHours: "" },
  settings: { businessName: "", tagline: "", copyright: "", themeColor: "" },
  logo: { imageUrl: "", title: "" },
  seo: { metaTitle: "", metaDescription: "", keywords: "", ogImage: "", canonicalUrl: "" },
  social: { facebook: "", instagram: "", whatsapp: "", youtube: "", linkedin: "" },
  enquiries: [],
};

function cacheSafeImageUrl(image: string, version?: number) {
  if (!image || image.startsWith("data:") || image.startsWith("blob:")) return image;
  const separator = image.includes("?") ? "&" : "?";
  return `${image}${separator}amarVersion=${version ?? Date.now()}`;
}

function safeCtaHref(value: string | undefined, fallback: string) {
  return value && (/^#[A-Za-z][\w-]*$/.test(value) || isSafeHttpUrl(value)) ? value : fallback;
}

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "#gallery" },
  { label: "Contact", href: "#contact" },
];

// Services are sourced from Firestore via `siteContent.services`.

// Gallery is read from Firestore via `siteContent.gallery`.


const serviceIconMap: Record<string, LucideIcon> = {
  "Graphic Designing": Palette,
  "Digital Printing": Send,
  "Offset Printing": Printer,
  "Screen Printing": LayoutTemplate,
  "Business Cards": BriefcaseBusiness,
  "Wedding Cards": CakeSlice,
  "Brochures & Flyers": BookOpen,
  "Banners & Flex": Scissors,
  "Stickers & Labels": Tag,
  Certificates: Award,
  "Bill Books": FileText,
  "ID Cards": QrCode,
  "Packaging Printing": LayoutTemplate,
  "Custom Printing": Sparkles,
};

const googleBusinessProfileUrl = "https://maps.google.com/?q=Amar+Printers+Kaikamba+Bantwal";

// Testimonials are loaded from Firestore via `siteContent.testimonials`.

// Reasons content should be provided by CMS where appropriate.

const whyChooseIconMap: Record<string, LucideIcon> = {
  ShieldCheck,
  Clock3,
  Palette,
  BadgeCheck,
  Sparkles,
  BriefcaseBusiness,
  Gift,
  HeartHandshake,
  Printer,
  MessageCircle,
  BookOpen,
  Award,
};

function getWhyChooseIcon(iconName?: string) {
  return whyChooseIconMap[iconName ?? ""] ?? ShieldCheck;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: "easeOut" as const } },
};

// Trust points are static marketing copy; the primary CMS-controlled values are loaded from Firestore.

const trustPoints = [
  {
    title: "Premium Print Quality",
    description: "Sharp finishes & vibrant colors.",
    icon: BadgeCheck,
  },
  {
    title: "Fast Turnaround",
    description: "On-time delivery, every time.",
    icon: Clock3,
  },
  {
    title: "Creative Design Support",
    description: "Professional design assistance.",
    icon: Palette,
  },
  {
    title: "Trusted Local Partner",
    description: "Serving businesses across Bantwal & Mangalore.",
    icon: BriefcaseBusiness,
  },
];

function AnimatedCounter({
  end,
  suffix = "",
  prefix = "",
  duration = 1400,
}: {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}) {
  const [value, setValue] = useState(0);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const counterRef = useRef<HTMLSpanElement | null>(null);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (shouldReduceMotion) {
      setHasEnteredViewport(true);
      return;
    }

    const counter = counterRef.current;
    if (!counter) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setHasEnteredViewport(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(counter);
    return () => observer.disconnect();
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (!hasEnteredViewport) {
      return;
    }

    if (shouldReduceMotion) {
      setValue(end);
      return;
    }

    let animationFrame = 0;
    let startTime: number | undefined;

    const step = (timestamp: number) => {
      if (startTime === undefined) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(end * easedProgress));

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(step);
      }
    };

    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [duration, end, hasEnteredViewport, shouldReduceMotion]);

  return <span ref={counterRef}>{prefix}{value}{suffix}</span>;
}

function Logo({ imageUrl, title }: { light?: boolean; imageUrl?: string; title?: string }) {
  const [failed, setFailed] = useState(false);
  const validatedImageUrl = safeImageUrl(imageUrl);

  // reset failure state when imageUrl changes
  useEffect(() => {
    setFailed(false);
  }, [imageUrl]);

  if (validatedImageUrl && !failed) {
    return (
      <span aria-label={title ?? "Amar Printers home"}>
        <img src={validatedImageUrl} alt={title ?? "Logo"} onError={() => setFailed(true)} className="h-11 w-11 shrink-0 rounded-md object-contain" />
      </span>
    );
  }

  return (
    <span aria-label="Amar Printers home">
      <svg className="h-11 w-11 shrink-0" viewBox="0 0 42 42" fill="none" aria-hidden="true">
        <path d="M2.5 37.5 15.4 5h7.1L10.1 37.5" stroke="#F4F4F5" strokeWidth="4.4" strokeLinecap="round" />
        <path d="m11.4 26.4 5.4-13.7 10.5 24.8" stroke="#E63946" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 9.4h6.1c5.5 0 8.3 2.1 8.3 6.2 0 4.2-3 6.4-8.6 6.4h-4.1" stroke="#F4F4F5" strokeWidth="4.4" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function ActionButton({
  href,
  children,
  variant,
  external = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant: "primary" | "secondary" | "outline" | "whatsapp" | "call" | "email" | "light";
  external?: boolean;
  className?: string;
}) {
  const variants = {
    primary: "border border-[#e63946] bg-[#e63946] text-white rounded-full hover:bg-[#c92d3a] hover:-translate-y-1 hover:shadow-[0_14px_35px_rgba(230,57,70,0.24)]",
    secondary: "border border-slate-300 bg-white text-[#141414] rounded-full hover:bg-slate-50 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(0,0,0,0.1)]",
    outline: "border-2 border-[#e63946] bg-white text-[#e63946] rounded-full hover:bg-[#fff5f5] hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(230,57,70,0.12)]",
    whatsapp: "border border-[#1ebf4b] bg-[#1ebf4b] text-white hover:bg-[#169b3e] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(30,191,75,0.22)]",
    call: "border border-[#e63946] bg-[#e63946] text-white hover:bg-[#c92d3a] hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(230,57,70,0.24)]",
    email: "border border-white/80 bg-white/10 text-white hover:bg-white hover:text-[#0f172a]",
    light: "border border-white/10 bg-white text-[#0f172a] hover:bg-[#f4b400] hover:text-[#0f172a]",
  };

  return (
    <a
      className={`button-ripple inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-bold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f4b400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0d10] ${variants[variant]} ${className}`}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

function ServicesPage({ services }: { services: Array<{ name: string; icon: LucideIcon; image: string; description: string }> }) {
  return (
    <section className="relative overflow-hidden bg-[#fcfbf7] py-10 sm:py-16 md:py-20">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          backgroundImage:
            "radial-gradient(circle at top left, rgba(230,57,70,0.08), transparent 32%), linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,245,240,0.95))",
        }}
      />
      <div className="relative mx-auto max-w-[1270px] px-4 sm:px-5 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mx-auto max-w-[760px] text-center">
          <p className="section-kicker">OUR SERVICES</p>
          <h1 className="mt-3 text-[clamp(1.9rem,5vw,2.9rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#111827]">Professional Printing Solutions</h1>
          <p className="mt-4 text-[14px] leading-7 text-slate-600 sm:text-[15px] sm:leading-7 lg:text-[16px]">
            From design to delivery, Amar Printers provides complete printing solutions for businesses, schools, organizations, and individuals.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4"
        >
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.article
                variants={fadeUp}
                key={service.name}
                className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
              >
                {service.image && <img src={service.image} alt={`${service.name} printing sample`} className="aspect-[1.45] w-full object-cover sm:aspect-[1.16]" />}
                <div className="flex flex-1 flex-col p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-[14px] font-extrabold leading-5 text-[#111827] sm:text-[15px]">{service.name}</h2>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-[#e63946]">
                      <Icon size={17} strokeWidth={1.8} />
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] leading-6 text-slate-600 sm:text-[13px]">{service.description}</p>
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:flex-row sm:p-8">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e63946] sm:text-[11px]">NEED PROFESSIONAL PRINTING?</p>
            <p className="mt-2 max-w-[680px] text-[clamp(1.15rem,3vw,1.8rem)] font-black leading-[1.15] text-[#111827]">Get in touch for your next printing project.</p>
          </div>
          <ActionButton href="/#contact" variant="primary" className="w-full shrink-0 sm:w-auto">Get a Free Quote <ArrowUpRight size={15} /></ActionButton>
        </div>
      </div>
    </section>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const isServicesRoute = location.pathname === "/services";
  const visibleNavLinks = isServicesRoute
    ? navLinks.map((link) => link.href.startsWith("#") ? { ...link, href: `/${link.href}` } : link)
    : navLinks;
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [hasAdminAccess, setHasAdminAccess] = useState(false);
  const [siteContent, setSiteContent] = useState<SiteContentState>(EMPTY_SITE_CONTENT);
  const [isSiteContentLoading, setIsSiteContentLoading] = useState(true);
  const [contentLoadError, setContentLoadError] = useState<string | null>(null);
  const [firebaseAuthLoading, setFirebaseAuthLoading] = useState(isFirebaseConfigured);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showAllGallery, setShowAllGallery] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [contactFormStatus, setContactFormStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [contactFormMessage, setContactFormMessage] = useState("");
  const [reviewIndex, setReviewIndex] = useState(0);
  const [visibleReviewCount, setVisibleReviewCount] = useState(3);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isBusinessOpenNow = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const weekdayOpen = currentMinutes >= 9 * 60 && currentMinutes < 19 * 60;
    const sundayOpen = currentMinutes >= 10 * 60 && currentMinutes < 14 * 60;

    return day >= 1 && day <= 6 ? weekdayOpen : sundayOpen;
  }, []);
  const galleryLightboxRef = useRef<HTMLDivElement | null>(null);

  const activeSiteContent = siteContent;

  const galleryData = useMemo(() => {
    const source = activeSiteContent.gallery;
    return source.map((item) => {
      const galleryItem = item as GalleryContent & { image?: string };
      return {
        id: item.id,
        title: item.title,
        category: item.category,
        image: safeImageUrl(String(galleryItem.imageUrl || galleryItem.image || "")) || "",
        storagePath: "storagePath" in item ? item.storagePath : undefined,
      };
    });
  }, [activeSiteContent.gallery]);
  const galleryFilters = useMemo(() => {
    const categories = Array.from(new Set(galleryData.map((item) => item.category).filter(Boolean)));
    return ["All", ...categories];
  }, [galleryData]);
  const filteredGallery = useMemo(
    () => (activeFilter === "All" ? galleryData : galleryData.filter((item) => item.category === activeFilter)),
    [activeFilter, galleryData],
  );
  const visibleGallery = showAllGallery ? filteredGallery : filteredGallery.slice(0, 6);
  const selectedImage = selectedIndex === null ? null : filteredGallery[selectedIndex] ?? null;
    const publicServices = useMemo(() => {
      if (activeSiteContent.services.length) {
        return activeSiteContent.services.map((service, index) => ({
          name: service.title,
          icon: serviceIconMap[service.title] ?? (index % 2 === 0 ? Palette : Printer),
          image: safeImageUrl(service.imageUrl) || "",
          description: service.description,
        }));
      }
      return [];
    }, [activeSiteContent.services]);
  const displayTestimonials = useMemo(() => {
    if (!activeSiteContent.testimonials.length) {
      return [] as GoogleReview[];
    }

    return activeSiteContent.testimonials.map((testimonial, index) => ({
      name: testimonial.name,
      rating: testimonial.rating,
      review: testimonial.review,
      date: "Recently added",
      verified: true,
      initials: (testimonial.name || "").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase() || `T${index + 1}`,
    }));
  }, [activeSiteContent.testimonials]);
  const visibleReviews = useMemo(() => {
    const slides: GoogleReview[] = [];
    if (!displayTestimonials || displayTestimonials.length === 0) return slides;
    for (let offset = 0; offset < visibleReviewCount; offset += 1) {
      const idx = (reviewIndex + offset) % displayTestimonials.length;
      const index = Number.isNaN(idx) ? 0 : idx;
      const item = displayTestimonials[index];
      if (item) slides.push(item);
    }
    return slides;
  }, [displayTestimonials, reviewIndex, visibleReviewCount]);

  useEffect(() => {
    let cancelled = false;
    const loadContent = async () => {
      setContentLoadError(null);
      try {
        const content = await loadSiteContent(hasAdminAccess);
        if (!cancelled) {
          setSiteContent(content);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Firestore content error";
        if (!cancelled) {
          setContentLoadError(message);
          console.error("[CMS] App content load failed", {
            code: error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "unknown",
            message,
          });
        }
      } finally {
        if (!cancelled) {
          setIsSiteContentLoading(false);
        }
      }
    };

    void loadContent();
    
    // Refresh on window focus
    const refreshOnFocus = () => {
      void loadContent();
    };
    window.addEventListener("focus", refreshOnFocus);
    
    // Auto-refresh every 30 seconds to catch CMS changes
    const refreshInterval = setInterval(() => {
      void loadContent();
    }, 30000);
    
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refreshOnFocus);
      clearInterval(refreshInterval);
    };
  }, [hasAdminAccess]);

  useEffect(() => {
    document.title = activeSiteContent.seo.metaTitle || "";
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute("content", activeSiteContent.seo.metaDescription || "");
    }
    const keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (keywordsMeta) {
      keywordsMeta.setAttribute("content", activeSiteContent.seo.keywords || "");
    }
    const canonicalLink = document.querySelector('link[rel="canonical"]');
    if (canonicalLink) {
      const canonical = isSafeHttpUrl(activeSiteContent.seo.canonicalUrl) ? activeSiteContent.seo.canonicalUrl! : window.location.href;
      canonicalLink.setAttribute("href", canonical);
    }
    // Open Graph / Twitter meta
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', activeSiteContent.seo.metaTitle || '');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute('content', activeSiteContent.seo.metaDescription || '');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const chosenOg = isSafeHttpUrl(activeSiteContent.seo.ogImage) ? activeSiteContent.seo.ogImage : isSafeHttpUrl(activeSiteContent.hero.imageUrl) ? activeSiteContent.hero.imageUrl : '';
    if (ogImage) ogImage.setAttribute('content', chosenOg);

    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', activeSiteContent.seo.metaTitle || '');
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute('content', activeSiteContent.seo.metaDescription || '');
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    const chosenTwitter = isSafeHttpUrl(activeSiteContent.seo.ogImage) ? activeSiteContent.seo.ogImage : isSafeHttpUrl(activeSiteContent.hero.imageUrl) ? activeSiteContent.hero.imageUrl : '';
    if (twitterImage) twitterImage.setAttribute('content', chosenTwitter);

    // Favicon / logo update (only allow http/https)
    if (activeSiteContent.logo?.imageUrl && isSafeHttpUrl(activeSiteContent.logo.imageUrl)) {
      const link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
      if (link) link.href = activeSiteContent.logo.imageUrl;
    }
  }, [activeSiteContent.seo]);

  useEffect(() => {
    if (selectedIndex === null) return;

    if (filteredGallery.length === 0) {
      setSelectedIndex(null);
      return;
    }

    if (selectedIndex >= filteredGallery.length) {
      setSelectedIndex(0);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedIndex(null);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedIndex((current) => current === null || filteredGallery.length === 0 ? null : (current + 1) % filteredGallery.length);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedIndex((current) => current === null || filteredGallery.length === 0 ? null : (current - 1 + filteredGallery.length) % filteredGallery.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredGallery, selectedIndex]);

  useEffect(() => {
    if (!firebaseAuth) {
      setFirebaseAuthLoading(false);
      return;
    }

    return onIdTokenChanged(firebaseAuth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setHasAdminAccess(false);
        setFirebaseAuthLoading(false);
        return;
      }
      void user.getIdTokenResult().then(({ claims }) => {
        setHasAdminAccess(claims.admin === true);
      }).catch(() => {
        setHasAdminAccess(false);
      }).finally(() => setFirebaseAuthLoading(false));
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    const refreshAdminClaim = async () => {
      try {
        const { claims } = await firebaseUser.getIdTokenResult(true);
        setHasAdminAccess(claims.admin === true);
      } catch {
        setHasAdminAccess(false);
      }
    };

    void refreshAdminClaim();
    const refreshTimer = window.setInterval(() => void refreshAdminClaim(), 5 * 60 * 1000);
    return () => window.clearInterval(refreshTimer);
  }, [firebaseUser]);

  // No local gallery/siteImages fallback: the `siteContent` loaded from Firestore is the single source of truth.

  useEffect(() => {
    const updateVisibleReviews = () => {
      if (window.innerWidth >= 1024) {
        setVisibleReviewCount(3);
      } else if (window.innerWidth >= 768) {
        setVisibleReviewCount(2);
      } else {
        setVisibleReviewCount(1);
      }
    };

    updateVisibleReviews();
    window.addEventListener("resize", updateVisibleReviews);
    return () => window.removeEventListener("resize", updateVisibleReviews);
  }, []);

  useEffect(() => {
    if (!displayTestimonials.length) return;

    const timer = window.setInterval(() => {
      setReviewIndex((current) => (current + 1) % displayTestimonials.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [displayTestimonials.length]);

  useEffect(() => {
    document.body.style.overflow = selectedIndex !== null ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedIndex]);

  const handleGalleryFilter = (filter: string) => {
    setActiveFilter(filter);
    setShowAllGallery(false);
  };

  const handleReviewNavigation = (direction: "prev" | "next") => {
    setReviewIndex((current) => {
      if (direction === "next") {
        return (current + 1) % displayTestimonials.length;
      }
      return (current - 1 + displayTestimonials.length) % displayTestimonials.length;
    });
  };

  const handleReviewSwipe = (endX: number) => {
    if (touchStartX === null) return;
    const delta = touchStartX - endX;
    if (Math.abs(delta) > 50) {
      handleReviewNavigation(delta > 0 ? "next" : "prev");
    }
    setTouchStartX(null);
  };

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setContactFormStatus("submitting");
    setContactFormMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      service: String(formData.get("service") ?? "").trim(),
      quantity: String(formData.get("quantity") ?? "").trim(),
      message: String(formData.get("message") ?? "").trim(),
    };

    const requiredFields: Array<[keyof typeof payload, string]> = [
      ["name", "Name"],
      ["phone", "Phone number"],
      ["email", "Email address"],
      ["service", "Service"],
      ["quantity", "Quantity"],
      ["message", "Message"],
    ];

    const missingField = requiredFields.find(([key]) => !payload[key]);
    if (missingField) {
      setContactFormStatus("error");
      setContactFormMessage(`${missingField[1]} is required.`);
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(payload.email)) {
      setContactFormStatus("error");
      setContactFormMessage("Please enter a valid email address.");
      return;
    }

    // Additional validation: phone format and maximum lengths
    const phonePattern = /^[0-9+\-()\s]{5,32}$/;
    if (!phonePattern.test(payload.phone)) {
      setContactFormStatus("error");
      setContactFormMessage("Please enter a valid phone number.");
      return;
    }

    const maxLengths: { [K in keyof typeof payload]: number } = {
      name: 100,
      phone: 32,
      email: 254,
      service: 100,
      quantity: 100,
      message: 2000,
    };

    for (const key of Object.keys(maxLengths) as Array<keyof typeof payload>) {
      const max = maxLengths[key];
      if (payload[key] && String(payload[key]).length > max) {
        setContactFormStatus("error");
        setContactFormMessage(`${key.charAt(0).toUpperCase() + key.slice(1)} is too long (maximum ${max} characters).`);
        return;
      }
    }

    const message = [
      "Hello Amar Printers,",
      "",
      "I would like to request a quotation.",
      "",
      "Customer Details",
      "",
      "Name:",
      payload.name,
      "",
      "Phone:",
      payload.phone,
      "",
      "Email:",
      payload.email,
      "",
      "Service Required:",
      payload.service,
      "",
      "Quantity:",
      payload.quantity,
      "",
      "Message:",
      payload.message,
      "",
      "Please provide me with a quotation.",
      "",
      "Thank you.",
    ].join("\n");

    const whatsappUrl = `https://wa.me/919482486971?text=${encodeURIComponent(message)}`;

    try {
      const isMobileBrowser = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || window.matchMedia("(max-width: 767px)").matches;

      if (isMobileBrowser) {
        window.location.href = whatsappUrl;
      } else {
        const newWindow = window.open(whatsappUrl, "_blank", "noopener,noreferrer");

        if (!newWindow) {
          window.location.href = whatsappUrl;
        }
      }

      setContactFormStatus("success");
      setContactFormMessage("Your WhatsApp quote request is ready.");

      const form = event.currentTarget;
      if (form instanceof HTMLFormElement) {
        form.reset();
      }
    } catch (error) {
      setContactFormStatus("error");
      setContactFormMessage(error instanceof Error ? error.message : "We could not open WhatsApp right now.");
    }
  };

  const handleAdminLogin = async (username: string, password: string) => {
    if (isFirebaseConfigured && firebaseAuth) {
      const email = username.trim();
      if (!email || !password) {
        throw new Error("Please enter both your email and password.");
      }
      await setPersistence(firebaseAuth, browserSessionPersistence);
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      navigate("/admin/dashboard");
      return;
    }
    // If Firebase is not configured, fail closed: do not allow a local/session fallback.
    throw new Error("Administrative login is unavailable because authentication is not configured.");
  };

  const handleAdminLogout = async () => {
    if (isFirebaseConfigured && firebaseAuth) {
      await signOut(firebaseAuth);
      setFirebaseUser(null);
    }

    // Always navigate to admin login. Do not offer a fallback logout that manipulates sessionStorage.
    navigate("/admin/login");
  };

  const resolvedSiteContent = siteContent;

  if (!isAdminRoute && isSiteContentLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0d10] text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full border border-white/10 bg-white/5" />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/70">Loading</p>
        </div>
      </div>
    );
  }

  if (isAdminRoute) {
    if (isFirebaseConfigured && firebaseAuthLoading) {
      return <AdminLoading />;
    }

    return (
      <Routes>
        <Route
          path="/admin/login"
          element={hasAdminAccess ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin onLogin={handleAdminLogin} siteContent={resolvedSiteContent} />}
        />
        <Route
          path="/admin/dashboard"
          element={hasAdminAccess ? <AdminDashboard siteContent={resolvedSiteContent} setSiteContent={setSiteContent} firebaseUser={firebaseUser} onLogout={handleAdminLogout} /> : <Navigate to="/admin/login" replace />}
        />
        <Route path="/admin" element={<Navigate to={hasAdminAccess ? "/admin/dashboard" : "/admin/login"} replace />} />
        <Route path="*" element={<Navigate to={hasAdminAccess ? "/admin/dashboard" : "/admin/login"} replace />} />
      </Routes>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-[#0f172a]">
      <header className="sticky top-0 z-40 border-b border-[#E8E4DC] bg-white shadow-[0_2px_12px_rgba(23,32,51,0.08)] backdrop-blur-xl">
        <div className="mx-auto flex h-[66px] max-w-[1240px] items-center justify-between px-5 lg:px-8">
          <a href="#home" onClick={() => setMobileMenuOpen(false)} className="flex items-center shrink-0">
            <Logo imageUrl={resolvedSiteContent.logo.imageUrl || undefined} title={resolvedSiteContent.logo.title || resolvedSiteContent.settings.businessName} />
            <div className="hidden sm:flex flex-col items-start justify-center ml-2">
              <p className="m-0 text-[13px] font-bold text-[#172033] leading-[1.2]">
                {resolvedSiteContent.settings.businessName}
              </p>
              <p className="m-0 mt-0.5 text-[10px] text-[#555B66] leading-[1.2] whitespace-nowrap">
                Creating Impressions. Delivering Excellence.
              </p>
            </div>
          </a>

          <nav className="hidden items-center gap-9 md:flex" aria-label="Primary navigation">
            {visibleNavLinks.map((link, index) => (
              <a
                key={link.href}
                className={`nav-link text-[12px] font-semibold tracking-[0.01em] transition-colors ${index === 0 ? "text-[#e63946]" : "text-[#172033] hover:text-[#e63946]"}`}
                href={link.href}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-7 lg:flex">
            <a href={safeTelHref(siteContent.contact.phone) || "#contact"} className="flex items-center gap-2 text-[11px] font-semibold leading-[1.35] text-[#555B66] transition-colors hover:text-[#e63946]">
              <Phone size={16} className="text-[#e63946]" />
              <span>{siteContent.contact.phone || ""}</span>
            </a>
            <a href={safeMailtoHref(siteContent.contact.email) || "#contact"} className="flex items-center gap-2 text-[11px] font-semibold text-[#555B66] transition-colors hover:text-[#e63946]">
              <Mail size={16} className="text-[#e63946]" />
              {siteContent.contact.email || ""}
            </a>
            <a href={safeTelHref(siteContent.contact.phone) || "#contact"} className="rounded-[3px] bg-[#e63946] px-3.5 py-2.5 text-[11px] font-extrabold text-white transition-colors hover:bg-[#c92d3a]">Call Now</a>
          </div>

          <button
            className="rounded-md border border-[#E8E4DC] p-2 text-[#172033] md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-[#E8E4DC] md:hidden"
              aria-label="Mobile navigation"
            >
              <div className="space-y-1 px-5 py-4 bg-white">
                {visibleNavLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block border-b border-[#E8E4DC] py-3 text-sm font-semibold text-[#172033] last:border-0 hover:text-[#e63946]"
                  >
                    {link.label}
                  </a>
                ))}
                <a href="tel:+919482486971" className="mt-3 inline-flex items-center gap-2 rounded-md bg-[#e63946] px-4 py-3 text-xs font-bold text-white">
                  <Phone size={15} /> Call Now
                </a>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main>
        {contentLoadError && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[11px] font-semibold text-amber-800">
            CMS diagnostic: {contentLoadError}
          </div>
        )}

        {isServicesRoute ? <ServicesPage services={publicServices} /> : <>
        <section id="home" className="hero relative isolate overflow-hidden bg-white">
          <div
            className="hero-background absolute inset-0 z-0 bg-cover bg-right-top"
            style={{
              backgroundImage: safeImageUrl(siteContent?.hero?.imageUrl)
                ? `url('${cacheSafeImageUrl(safeImageUrl(siteContent.hero.imageUrl)!)}')`
                : undefined,
            }}
          />
          <div
            className="hero-overlay absolute inset-0 z-10"
            style={{
              background: "linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgb(255, 255, 255) 30%, rgb(247, 245, 245) 52%, rgba(255, 255, 255, 0.89) 74%, rgba(255, 255, 255, 0.45) 100%)",
            }}
          />

          <div className="relative z-20 mx-auto flex min-h-[780px] max-w-[1400px] items-center px-5 py-16 max-md:min-h-0 max-md:items-start max-md:pb-16 max-md:pt-7 lg:px-8">
            <div className="w-full max-w-[600px] max-md:max-w-none">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: "easeOut" }}
                className="flex items-center gap-3 relative z-10 max-md:gap-2"
              >
                <p className="text-[12px] font-bold uppercase tracking-[0.22em] text-[#e63946] max-md:text-[10px] max-md:tracking-[0.14em]">
                  PROFESSIONAL PRINTING SERVICES
                </p>
                <div className="h-px w-8 bg-[#e63946]" />
              </motion.div>
              <motion.h1
                initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.65, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.08 }}
                className="mt-5 text-[clamp(2.2rem,4vw,4rem)] font-black leading-[1.1] tracking-[-0.035em] text-[#172033] relative z-10 max-md:mt-3 max-md:max-w-[310px] max-md:text-[1.95rem] max-md:leading-[1.08] max-[374px]:max-w-[280px] max-[374px]:text-[1.72rem]"
              >
                {resolvedSiteContent.hero.heading}
              </motion.h1>
              <motion.p
                initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.55, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.22 }}
                className="mt-5 max-w-[550px] text-[15px] leading-7 text-[#555B66] sm:text-[16px] relative z-10 max-md:mt-3 max-md:max-w-[320px] max-md:text-[12.5px] max-md:leading-6 max-[374px]:max-w-[290px] max-[374px]:text-[12px] max-[374px]:leading-5"
              >
                {resolvedSiteContent.hero.subtitle}
              </motion.p>
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.34 }}
                className="mt-6 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.24em] text-[#172033] relative z-10 max-md:mt-4 max-md:text-[10px] max-md:tracking-[0.12em] max-[374px]:mt-3"
              >
                <span className="text-[#e63946]">💡</span>
                <span>
                  Creating Ideas. Making{" "}
                  <span className="text-[#e63946]">Lasting Impressions.</span>
                </span>
              </motion.div>
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.46 }}
                className="mt-8 grid grid-cols-2 gap-3 relative z-10 max-md:mt-5 max-md:max-w-[350px] max-md:grid-cols-1 max-md:gap-2.5 max-[374px]:mt-4"
              >
                <ActionButton href={safeCtaHref(resolvedSiteContent.hero.ctaLink, "#contact")} variant="primary" className="w-full min-h-11 max-[374px]:px-3 max-[374px]:py-2 max-[374px]:text-[11px]">
                  <Sparkles size={16} /> {resolvedSiteContent.hero.ctaText}
                </ActionButton>
                <ActionButton href="https://wa.me/919482486971" variant="secondary" external className="w-full min-h-11 max-[374px]:px-3 max-[374px]:py-2 max-[374px]:text-[11px]">
                  <MessageCircle size={16} fill="currentColor" /> WhatsApp Us
                </ActionButton>
                <ActionButton href="/services" variant="outline" className="w-full min-h-11 max-[374px]:px-3 max-[374px]:py-2 max-[374px]:text-[11px]">
                  <Printer size={16} /> Services
                </ActionButton>
                <ActionButton href="tel:+919482486971" variant="outline" className="w-full min-h-11 max-[374px]:px-3 max-[374px]:py-2 max-[374px]:text-[11px]">
                  <Phone size={16} /> Call Now
                </ActionButton>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.5, ease: "easeOut", delay: shouldReduceMotion ? 0 : 0.58 }}
                className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-2 relative z-10 max-md:mt-5 max-md:max-w-[350px] max-md:gap-2 max-[374px]:mt-4"
              >
                {trustPoints.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li
                      key={item.title}
                      className="group list-none rounded-[14px] border border-[#E8E4DC] bg-white p-3 shadow-[0_2px_6px_rgba(23,32,51,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_6px_16px_rgba(23,32,51,0.1)] max-md:min-h-[72px] max-md:p-2.5 max-[374px]:min-h-[64px] max-[374px]:p-1.5"
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e63946]/12 text-[#e63946] max-md:h-6 max-md:w-6">
                          <Icon size={16} className="max-md:h-[13px] max-md:w-[13px]" />
                        </div>
                        <div>
                          <p className="text-[12px] font-extrabold text-[#172033] max-md:text-[10px] max-[374px]:text-[9px]">{item.title}</p>
                          <p className="mt-0.5 text-[11px] leading-4 text-[#555B66] max-md:text-[9px] max-md:leading-3 max-[374px]:text-[8px] max-[374px]:leading-3">{item.description}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </motion.div>

              <div className="mt-8 flex max-w-[550px] items-center gap-3 rounded-full border border-[#E8E4DC] bg-white px-4 py-3 text-sm shadow-[0_4px_12px_rgba(23,32,51,0.08)] relative z-10 max-md:mt-5 max-md:gap-2 max-md:px-3 max-md:py-2.5 max-[374px]:mt-4">
                <span className="text-[13px] tracking-[0.16em] text-[#e63946]" aria-label="Five star rating">★★★★★</span>
                <span className="text-[13px] leading-5 text-[#555B66]">Trusted by businesses, schools, and organizations across Bantwal & Mangalore.</span>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="border-b border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#fcfcfd_100%)]">
          <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 md:py-20 lg:px-8">
            <div className="grid gap-6 sm:gap-8 lg:grid-cols-[1.03fr_0.97fr] lg:gap-16">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="max-w-[620px]"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#e63946] sm:text-[11px]">ABOUT AMAR PRINTERS</p>
                <motion.h2
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.55, ease: "easeOut" as const }}
                  className="mt-3 text-[clamp(1.9rem,5vw,2.9rem)] font-black leading-[1.04] tracking-[-0.03em] text-[#111827]"
                >
                  {siteContent.about.heading}
                </motion.h2>
                <motion.p
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: shouldReduceMotion ? 0 : 0.08, ease: "easeOut" as const }}
                  className="mt-4 text-[14px] leading-7 text-slate-600 sm:mt-6 sm:text-[15px] sm:leading-8"
                >
                  {siteContent.about.description}
                </motion.p>
                <motion.a
                  href="https://wa.me/919482486971?text=Hi%20Amar%20Printers%2C%20I%20would%20like%20to%20get%20a%20quotation%20for%20my%20printing%20requirement."
                  target="_blank"
                  rel="noreferrer"
                  whileHover={{ y: -2, scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#e63946]/20 bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(230,57,70,0.18)] transition-all duration-300 hover:bg-[#c92d3a] hover:shadow-[0_14px_30px_rgba(230,57,70,0.24)] sm:mt-8 sm:text-[13px]"
                >
                  Get a Free Quote <ArrowUpRight size={15} />
                </motion.a>

                <div className="mt-4 grid gap-3 grid-cols-1 sm:mt-8 sm:grid-cols-2">
                  {[
                    { title: "Premium Print Quality", description: "Sharp finishes and vibrant colors.", icon: ShieldCheck },
                    { title: "Fast Turnaround", description: "On-time delivery, every time.", icon: Clock3 },
                    { title: "Creative Design Support", description: "Professional design assistance.", icon: Palette },
                    { title: "Customer Satisfaction", description: "Trusted by clients who value quality.", icon: HeartHandshake },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <motion.div
                        key={item.title}
                        whileHover={{ y: -3, scale: 1.01 }}
                        transition={{ duration: 0.2 }}
                        className="rounded-[18px] border border-slate-200 bg-white p-3 shadow-[0_10px_30px_rgba(15,23,42,0.05)] sm:p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e63946]/10 text-[#e63946]">
                            <Icon size={18} />
                          </div>
                          <div>
                            <p className="text-[12px] font-extrabold text-[#111827] sm:text-[13px]">{item.title}</p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-600 sm:text-[12px]">{item.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, x: 22, y: 18 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                className="w-full"
              >
                <div className="rounded-[28px] border border-slate-200 bg-white p-2 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-3">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, ease: "easeOut" as const }}
                    className="overflow-hidden rounded-[22px]"
                  >
                    <img
                      src={safeImageUrl(siteContent?.about?.imageUrl) ? cacheSafeImageUrl(safeImageUrl(siteContent.about.imageUrl)!) : undefined}
                      alt="Amar Printers printing shop and professional printing equipment"
                      className="aspect-[1.45] w-full max-w-full object-cover transition-transform duration-700 hover:scale-[1.04] sm:aspect-[1.1]"
                    />
                  </motion.div>

                  <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-5 sm:gap-3">
                    {[
                      { value: 38, suffix: "+", label: "Years of Experience" },
                      { value: 5000, suffix: "+", label: "Happy Customers" },
                      { value: 50000, suffix: "+", label: "Prints Delivered" },
                      { value: 100, suffix: "%", label: "Commitment to Quality" },
                    ].map((stat) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, y: 16 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, amount: 0.2 }}
                        transition={{ duration: 0.45, ease: "easeOut" as const }}
                        className="rounded-[14px] border border-slate-200 bg-slate-50 p-2 sm:p-4"
                      >
                        <p className="text-[18px] font-black leading-none text-[#111827] sm:text-[22px]">
                          <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:mt-2 sm:text-[12px]">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section id="why-choose" className="relative border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(230,57,70,0.06),transparent_28%),linear-gradient(180deg,#fefefe_0%,#fcfbf8_100%)]">
          <div className="mx-auto max-w-[1240px] px-4 py-8 sm:px-5 md:py-20 lg:px-8">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="mx-auto max-w-[760px] text-center"
            >
              <p className="section-kicker">{siteContent.whyChoose.subtitle}</p>
              <h2 className="mt-3 text-[clamp(1.9rem,5vw,2.9rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#111827]">
                {siteContent.whyChoose.title}
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-slate-600 sm:mt-5 sm:text-[15px] sm:leading-8">
                {siteContent.whyChoose.description}
              </p>
            </motion.div>

            <div className="mt-6 grid gap-3 sm:mt-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {siteContent.whyChoose.items.map((item, index) => {
                  const Icon = getWhyChooseIcon(item.icon);
                  return (
                    <motion.div
                      key={`${item.title}-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.2 }}
                      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" as const }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className="rounded-[18px] border border-slate-200 bg-white p-2.5 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:p-5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#e63946]/10 text-[#e63946] sm:h-11 sm:w-11">
                          <Icon size={17} className="sm:h-[19px] sm:w-[19px]" />
                        </div>
                        <div>
                          <p className="text-[11px] font-extrabold leading-4 text-[#111827] sm:text-[14px] sm:leading-normal">{item.title}</p>
                          <p className="mt-1 text-[10px] leading-4 text-slate-600 sm:mt-2 sm:text-[13px] sm:leading-6">{item.description}</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                className="w-full"
              >
                <div className="rounded-[24px] border border-slate-200 bg-white p-2 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-3">
                  <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, ease: "easeOut" as const }}
                    className="overflow-hidden rounded-[24px]"
                  >
                    <img
                      src={safeImageUrl(siteContent.whyChoose.imageUrl) ? cacheSafeImageUrl(safeImageUrl(siteContent.whyChoose.imageUrl)!) : undefined}
                      alt="Amar Printers team working on printing equipment and production"
                      className="aspect-[1.45] w-full max-w-full object-cover transition-transform duration-700 hover:scale-[1.03] sm:aspect-[1.08]"
                    />
                  </motion.div>

                  <div className="mt-2 rounded-[18px] border border-slate-200 bg-slate-50 p-3 sm:mt-3 sm:p-5">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e63946] sm:text-[12px]">TRUSTED FROM CONCEPT TO DELIVERY</p>
                    <p className="mt-3 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">
                      From the first design brief to final delivery, our team manages every detail with precision, care, and commitment.
                    </p>
                    <a href="#contact" className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#e63946]/20 bg-[#e63946] px-4.5 py-2.5 text-[11px] font-bold text-white transition-all duration-300 hover:bg-[#c92d3a] hover:shadow-[0_10px_24px_rgba(230,57,70,0.18)] sm:text-[12px]">
                      Request a Quote <ArrowUpRight size={14} />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-10 sm:gap-3 xl:grid-cols-4">
              {[
                { value: 50, suffix: "+", label: "Years of Experience" },
                { value: 5000, suffix: "+", label: "Happy Customers" },
                { value: 50000, suffix: "+", label: "Projects Completed" },
                { value: 1000, suffix: "%", label: "Commitment to Quality" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, ease: "easeOut" as const }}
                  className="rounded-[18px] border border-slate-200 bg-white p-2.5 text-center shadow-[0_12px_36px_rgba(15,23,42,0.05)] sm:p-5"
                >
                  <p className="text-[20px] font-black leading-none text-[#111827] sm:text-[24px]">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 sm:mt-2 sm:text-[12px]">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="relative overflow-hidden bg-[#fcfbf7] py-8 sm:py-16 md:py-20">
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at top left, rgba(230,57,70,0.08), transparent 32%), linear-gradient(135deg, rgba(255,255,255,0.95), rgba(248,245,240,0.95))",
            }}
          />
          <div className="relative mx-auto max-w-[1270px] px-4 sm:px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="mx-auto max-w-[760px] text-center">
              <p className="section-kicker">OUR SERVICES</p>
              <h2 className="mt-3 text-[clamp(1.9rem,5vw,2.9rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#111827]">
                Professional Printing Solutions
              </h2>
              <p className="mt-4 text-[14px] leading-7 text-slate-600 sm:text-[15px] sm:leading-7 lg:text-[16px]">
                From design to delivery, Amar Printers provides complete printing solutions for businesses, schools, organizations, and individuals.
              </p>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.12 }}
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              className="mt-5 grid grid-cols-2 gap-2 sm:mt-10 sm:gap-4 md:grid-cols-2 lg:grid-cols-4"
            >
              {publicServices.map((service) => {
                const Icon = service.icon;
                return (
                  <motion.article
                    variants={fadeUp}
                    key={service.name}
                    whileHover={{ y: -6, scale: 1.01 }}
                    transition={{ duration: 0.3, ease: "easeOut" as const }}
                    className="group flex h-full flex-col overflow-hidden rounded-[16px] border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-[#e63946]/60 hover:shadow-[0_22px_50px_rgba(15,23,42,0.12)]"
                  >
                    {service.image && <div className="overflow-hidden">
                      <img
                        src={service.image}
                        alt={`${service.name} printing sample`}
                        className="aspect-[1.45] w-full max-w-full object-cover transition-transform duration-300 group-hover:scale-[1.05] sm:aspect-[1.16]"
                      />
                    </div>}
                    <div className="flex flex-1 flex-col p-2.5 sm:p-5">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-[12px] font-extrabold leading-4 text-[#111827] sm:text-[15px] sm:leading-normal">{service.name}</h3>
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-[#e63946] transition-transform duration-300 group-hover:scale-110 sm:h-9 sm:w-9">
                          <Icon size={15} strokeWidth={1.8} className="sm:h-[17px] sm:w-[17px]" />
                        </span>
                      </div>
                      <p className="mt-2 text-[10px] leading-4 text-slate-600 sm:mt-3 sm:text-[13px] sm:leading-6">{service.description}</p>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" as const }}
              className="mt-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:mt-10 sm:p-8"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[680px]">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e63946] sm:text-[11px]">NEED PROFESSIONAL PRINTING?</p>
                  <h3 className="mt-2 text-[clamp(1.25rem,3vw,1.8rem)] font-black leading-[1.15] tracking-[-0.025em] text-[#111827]">
                    Whether you need a single business card or thousands of brochures, Amar Printers delivers premium quality with fast turnaround.
                  </h3>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                  <a
                    href="#contact"
                    className="inline-flex w-full items-center justify-center rounded-full border border-[#e63946]/20 bg-[#e63946] px-5 py-3 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(230,57,70,0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#c92d3a] hover:shadow-[0_14px_30px_rgba(230,57,70,0.24)] sm:w-auto"
                  >
                    Get a Free Quote
                  </a>
                  <a
                    href="https://wa.me/919482486971?text=Hi%20Amar%20Printers%2C%20I%20would%20like%20to%20discuss%20my%20printing%20requirements."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-[13px] font-bold text-[#111827] transition-all duration-300 hover:-translate-y-1 hover:border-[#e63946]/50 hover:text-[#e63946] sm:w-auto"
                  >
                    WhatsApp Now
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="gallery" className="bg-[#f8f7f3] py-8 text-[#111827] sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1270px] px-4 sm:px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="mx-auto max-w-[760px] text-center">
              <p className="section-kicker">OUR PORTFOLIO</p>
              <h2 className="mt-3 text-[clamp(1.9rem,5vw,2.9rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#111827]">Our Portfolio</h2>
              <p className="mt-4 text-[14px] leading-7 text-slate-600 sm:text-[15px] sm:leading-7 lg:text-[16px]">
                A glimpse of the premium printing solutions we&apos;ve delivered for businesses, schools, organizations, and individuals.
              </p>
            </motion.div>

            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {galleryFilters.map((filter) => (
                <button
                  key={filter}
                  className={`rounded-full border px-4 py-2 text-[11px] font-bold tracking-[0.02em] transition-all duration-300 ${activeFilter === filter ? "border-[#e63946] bg-[#e63946] text-white shadow-[0_8px_20px_rgba(230,57,70,0.18)]" : "border-slate-300 bg-white text-slate-600 hover:border-[#e63946]/50 hover:text-[#e63946]"}`}
                  onClick={() => handleGalleryFilter(filter)}
                >
                  {filter}
                </button>
              ))}
            </div>

            <motion.div layout className="mt-5 columns-2 gap-2 sm:mt-8 sm:gap-4 lg:columns-3">
              <AnimatePresence mode="popLayout">
                {visibleGallery.map((item, index) => {
                  const isLarge = index % 4 === 0 || index % 4 === 3;
                  return (
                    <motion.button
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 16 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                      key={item.id ?? `${item.category}-${item.title}`}
                      onClick={() => {
                        const itemIndex = filteredGallery.indexOf(item);
                        if (itemIndex >= 0) setSelectedIndex(itemIndex);
                      }}
                      className={`group relative mb-2 block w-full max-w-full overflow-hidden rounded-[16px] border border-slate-200 bg-white text-left shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:mb-3 ${isLarge ? "sm:break-inside-avoid" : "sm:break-inside-avoid"}`}
                      aria-label={`Open ${item.category} image`}
                    >
                      <div className="overflow-hidden">
                        <img
                          src={item.image || undefined}
                          alt={`${item.category} sample from Amar Printers`}
                          loading="lazy"
                          className="h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                      </div>
                      <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/78 via-black/20 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#f4b400]">{item.category}</p>
                        <p className="mt-1 text-[14px] font-semibold text-white">{item.title}</p>
                        <span className="mt-3 inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
                          View Project <ArrowUpRight size={13} />
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </motion.div>

            {filteredGallery.length > 6 && (
              <div className="mt-7 text-center">
                <button onClick={() => setShowAllGallery((show) => !show)} className="inline-flex items-center gap-2 rounded-full border border-[#e63946]/20 bg-[#e63946] px-6 py-3 text-[12px] font-bold text-white shadow-[0_10px_24px_rgba(230,57,70,0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#c92d3a] hover:shadow-[0_14px_30px_rgba(230,57,70,0.24)]">
                  {showAllGallery ? "Show Less" : "View More"} <ArrowUpRight size={15} />
                </button>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.45, ease: "easeOut" as const }}
              className="mt-8 overflow-hidden rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:mt-10 sm:p-8"
            >
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-[680px]">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e63946] sm:text-[11px]">READY TO PRINT YOUR NEXT PROJECT?</p>
                  <h3 className="mt-2 text-[clamp(1.25rem,3vw,1.8rem)] font-black leading-[1.15] tracking-[-0.025em] text-[#111827]">
                    From a single business card to large commercial printing, Amar Printers is ready to deliver outstanding quality.
                  </h3>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                  <a
                    href="#contact"
                    className="inline-flex w-full items-center justify-center rounded-full border border-[#e63946]/20 bg-[#e63946] px-5 py-3 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(230,57,70,0.18)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#c92d3a] hover:shadow-[0_14px_30px_rgba(230,57,70,0.24)] sm:w-auto"
                  >
                    Get a Free Quote
                  </a>
                  <a
                    href="https://wa.me/919482486971?text=Hi%20Amar%20Printers%2C%20I%20would%20like%20to%20discuss%20my%20printing%20requirements."
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-[13px] font-bold text-[#111827] transition-all duration-300 hover:-translate-y-1 hover:border-[#e63946]/50 hover:text-[#e63946] sm:w-auto"
                  >
                    WhatsApp Now
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="reviews" className="border-t border-slate-100 bg-[linear-gradient(180deg,#fffdf9_0%,#ffffff_100%)] py-8 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1240px] px-4 sm:px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="text-center">
              <p className="section-kicker">CUSTOMER TESTIMONIALS</p>
              <h2 className="mt-3 text-[clamp(1.9rem,5vw,2.85rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#111827]">
                What Our Customers Say
              </h2>
              <p className="mx-auto mt-4 max-w-[760px] text-[14px] leading-7 text-slate-600 sm:mt-5 sm:text-[15px] sm:leading-8">
                Trusted by hundreds of customers for quality printing, fast delivery, and excellent service.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="mt-5 rounded-[28px] border border-slate-200 bg-white/80 p-3 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:mt-10 sm:p-8 lg:p-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-[340px]">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[18px] text-[#f4b400] sm:text-[20px]" aria-label="4.8 out of 5 stars">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <div className="text-[14px] font-extrabold text-[#111827] sm:text-[15px]">4.8 / 5 Rating</div>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-slate-700 sm:text-[15px]">Based on 73 Google Reviews</p>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#e63946]/15 bg-[#fff7f8] px-3 py-2 text-[11px] font-semibold text-[#e63946] sm:text-[12px]">
                    <span>⭐</span>
                    Reviews from Google
                  </div>
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
                  <a href={googleBusinessProfileUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#c92d3a] hover:shadow-[0_12px_24px_rgba(230,57,70,0.2)] sm:w-auto sm:text-[13px]">
                    <span>⭐</span> View All Google Reviews
                  </a>
                  <a href={googleBusinessProfileUrl} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-[12px] font-bold text-[#111827] transition-all duration-300 hover:-translate-y-1 hover:border-[#e63946]/40 hover:text-[#e63946] sm:w-auto sm:text-[13px]">
                    <span>✍</span> Write a Google Review
                  </a>
                </div>
              </div>

              <div
                className="mt-5 sm:mt-8"
                onTouchStart={(event) => setTouchStartX(event.touches[0]?.clientX ?? null)}
                onTouchEnd={(event) => handleReviewSwipe(event.changedTouches[0]?.clientX ?? 0)}
              >
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {visibleReviews.map((review, index) => (
                    <motion.article
                      key={`${review.name}-${index}`}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      whileHover={{ y: -6, scale: 1.01 }}
                      transition={{ duration: 0.35 }}
                      className="flex h-full flex-col rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fdfaf2_100%)] p-3 shadow-[0_16px_44px_rgba(15,23,42,0.08)] sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#e63946]/10 text-[15px] font-black text-[#e63946]">
                            {review.initials}
                          </div>
                          <div>
                            <h3 className="text-[14px] font-extrabold text-[#111827] sm:text-[15px]">{review.name}</h3>
                            <p className="mt-1 text-[11px] text-slate-500 sm:text-[12px]">{review.date}</p>
                          </div>
                        </div>
                        {review.verified && (
                          <span className="rounded-full border border-[#1ebf4b]/20 bg-[#f1fdf4] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-[#1b7a35] sm:px-3 sm:text-[10px]">
                            Verified
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center gap-1 text-[15px] text-[#f4b400]" aria-label={`${review.rating} out of 5 stars`}>
                        {Array.from({ length: review.rating }).map((_, starIndex) => (
                          <span key={`${review.name}-${starIndex}`}>★</span>
                        ))}
                      </div>

                      <p className="mt-4 flex-1 text-[13px] leading-6 text-slate-600 sm:text-[14px] sm:leading-7">“{review.review}”</p>
                    </motion.article>
                  ))}
                </div>

                <div className="mt-6 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {displayTestimonials.map((review, index) => (
                      <button
                        key={review.name}
                        type="button"
                        onClick={() => setReviewIndex(index)}
                        className={`h-2.5 rounded-full transition-all duration-300 ${index === reviewIndex ? "w-8 bg-[#e63946]" : "w-2.5 bg-slate-300"}`}
                        aria-label={`Show review ${index + 1}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => handleReviewNavigation("prev")} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-all duration-300 hover:border-[#e63946]/30 hover:text-[#e63946]" aria-label="Show previous reviews">
                      <ChevronLeft size={18} />
                    </button>
                    <button type="button" onClick={() => handleReviewNavigation("next")} className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition-all duration-300 hover:border-[#e63946]/30 hover:text-[#e63946]" aria-label="Show next reviews">
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="mt-6 grid gap-2.5 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
              {[
                "Trusted by Local Businesses",
                "Fast Delivery",
                "Premium Printing Quality",
                "Affordable Pricing",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-[#fff7f8] px-3 py-3 text-[12px] font-semibold text-slate-700 sm:text-[13px]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e63946]/10 text-[#e63946]">✓</span>
                  {item}
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        <section id="contact" className="border-t border-slate-100 bg-white py-8 sm:py-16 md:py-20">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-5 lg:px-8">
            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.3 }} className="text-center">
              <p className="section-kicker">CONTACT US</p>
              <h2 className="mt-3 text-[clamp(1.9rem,5vw,2.85rem)] font-black leading-[1.06] tracking-[-0.03em] text-[#111827]">
                Let&apos;s Bring Your Ideas to Life
              </h2>
              <p className="mx-auto mt-4 max-w-[760px] text-[14px] leading-7 text-slate-600 sm:mt-5 sm:text-[15px] sm:leading-8">
                Have a printing requirement? Contact Amar Printers today for premium quality printing, creative designs, and fast turnaround.
              </p>
            </motion.div>

            <div className="mt-5 grid gap-3 sm:mt-12 lg:grid-cols-[0.92fr_1.08fr] lg:gap-10">
              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="space-y-2 sm:space-y-3">
                {[
                  { title: "Address", value: siteContent.contact.address, href: safeExternalHref(siteContent.contact.googleMapsUrl) || "#contact", icon: MapPin, isLink: Boolean(safeExternalHref(siteContent.contact.googleMapsUrl)) },
                  { title: "Phone Number", value: siteContent.contact.phone, href: safeTelHref(siteContent.contact.phone) || "#contact", icon: Phone, isLink: Boolean(safeTelHref(siteContent.contact.phone)) },
                  { title: "WhatsApp", value: "Chat with our team for quick quotes", href: safeWhatsAppHref(siteContent.social.whatsapp) || safeWhatsAppHref(siteContent.contact.whatsapp) || "#contact", icon: MessageCircle, isLink: Boolean(safeWhatsAppHref(siteContent.social.whatsapp) || safeWhatsAppHref(siteContent.contact.whatsapp)) },
                  { title: "Email", value: siteContent.contact.email, href: safeMailtoHref(siteContent.contact.email) || "#contact", icon: Mail, isLink: Boolean(safeMailtoHref(siteContent.contact.email)) },
                  { title: "Business Hours", value: siteContent.contact.workingHours, href: "#contact", icon: Clock3, isLink: false },
                ].map((item, index) => {
                  const Icon = item.icon;
                  const content = (
                    <>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fff1f1] text-[#e63946] sm:h-12 sm:w-12">
                        <Icon size={18} className="sm:h-5 sm:w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-[#111827] sm:text-[13px]">{item.title}</p>
                        <p className="mt-2 whitespace-pre-line break-words text-[12px] leading-6 text-slate-600 sm:text-[13px]">{item.value}</p>
                      </div>
                    </>
                  );

                  return (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" as const }}
                      whileHover={{ y: -3, scale: 1.01 }}
                    >
                      {item.isLink ? (
                        <a
                          href={item.href}
                          target={item.href.startsWith("http") ? "_blank" : undefined}
                          rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                          className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] transition-all duration-300 hover:border-[#e63946]/30 hover:shadow-[0_16px_44px_rgba(15,23,42,0.09)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e63946]/30 sm:gap-4 sm:p-5"
                        >
                          {content}
                        </a>
                      ) : (
                        <div className="flex items-start gap-3 rounded-[22px] border border-slate-200 bg-white p-3 shadow-[0_12px_36px_rgba(15,23,42,0.06)] sm:gap-4 sm:p-5">
                          {content}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fefcf9_100%)] p-3 shadow-[0_25px_70px_rgba(15,23,42,0.08)] sm:p-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#e63946] sm:text-[11px]">REQUEST A FREE QUOTE</p>
                    <h3 className="mt-2 text-[1.15rem] font-black tracking-[-0.02em] text-[#111827] sm:text-[1.4rem]">Tell us about your project</h3>
                  </div>
                  <div className="rounded-full bg-[#e63946]/10 px-3 py-1 text-[10px] font-bold text-[#e63946] sm:text-[11px]">Fast reply</div>
                </div>

                <form
                  className="mt-3 grid gap-2.5 sm:mt-4 sm:gap-3"
                  onSubmit={handleContactSubmit}
                >

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-[12px] font-semibold text-slate-600">
                      <span className="mb-2 block">Full Name</span>
                      <input type="text" name="name" placeholder="Your name" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/15" />
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-600">
                      <span className="mb-2 block">Phone Number</span>
                      <input type="tel" name="phone" placeholder="Your phone" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/15" />
                    </label>
                  </div>

                  <label className="block text-[12px] font-semibold text-slate-600">
                    <span className="mb-2 block">Email Address</span>
                    <input type="email" name="email" placeholder="you@example.com" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/15" />
                  </label>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-[12px] font-semibold text-slate-600">
                      <span className="mb-2 block">Service Required</span>
                      <select name="service" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/15">
                        <option value="">Select a service</option>
                        <option>Business Cards</option>
                        <option>Brochures &amp; Flyers</option>
                        <option>Wedding Cards</option>
                        <option>Screen printing </option>
                        <option>Invitations </option>
                        <option>Graphic designing </option>
                        <option>Packaging Printing</option>
                        <option>Custom Printing</option>
                      </select>
                    </label>
                    <label className="block text-[12px] font-semibold text-slate-600">
                      <span className="mb-2 block">Quantity</span>
                      <input type="text" name="quantity" placeholder="e.g. 500 units" required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/15" />
                    </label>
                  </div>

                  <label className="block text-[12px] font-semibold text-slate-600">
                    <span className="mb-2 block">Message</span>
                    <textarea name="message" rows={4} placeholder="Tell us about your printing needs..." required className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/15" />
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button type="submit" disabled={contactFormStatus === "submitting"} className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#e63946] px-5 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#c92d3a] hover:shadow-[0_12px_24px_rgba(230,57,70,0.18)] disabled:cursor-not-allowed disabled:opacity-70">
                      Get Free Quote <ArrowUpRight size={15} />
                    </button>
                    <a href="https://wa.me/919482486971?text=Hi%20Amar%20Printers%2C%20I%20would%20like%20to%20discuss%20my%20printing%20requirements." target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-[#1ebf4b] bg-[#1ebf4b] px-5 py-3 text-[13px] font-bold text-white transition-all duration-300 hover:-translate-y-1 hover:bg-[#169b3e] hover:shadow-[0_12px_24px_rgba(30,191,75,0.2)]">
                      <MessageCircle size={15} fill="currentColor" /> WhatsApp Us
                    </a>
                  </div>

                  {contactFormStatus !== "idle" && (
                    <div className={`rounded-2xl border px-4 py-3 text-[12px] font-semibold ${contactFormStatus === "success" ? "border-[#1ebf4b]/20 bg-[#f1fdf4] text-[#1b7a35]" : "border-[#e63946]/20 bg-[#fff7f8] text-[#b42318]"}`}>
                      {contactFormMessage}
                    </div>
                  )}

                  <p className="text-[12px] font-semibold text-slate-500">Response within 24 hours.</p>
                </form>
              </motion.div>
            </div>

            <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.25 }} className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:mt-8">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#e63946] sm:text-[11px]">FIND US</p>
                  <p className="mt-1 text-[13px] font-semibold text-slate-700 sm:text-[14px]">Visit our printing studio in Bantwal</p>
                </div>
                <a href="https://maps.google.com/?q=Amar+Printers+Kaikamba+Bantwal" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-[#e63946]/20 bg-[#e63946] px-4 py-2 text-[11px] font-bold text-white transition-all duration-300 hover:bg-[#c92d3a] sm:text-[12px]">
                  Get Directions <ArrowUpRight size={14} />
                </a>
              </div>
              <iframe
                title="Google Map for Amar Printers"
                src="https://www.google.com/maps?q=Amar+Printers+Kaikamba+Bantwal&output=embed"
                className="h-[260px] w-full border-0 sm:h-[320px] lg:h-[420px]"
                loading="lazy"
              />
            </motion.div>
          </div>
        </section>
        </>}
      </main>

      <footer className="bg-[#07131d] text-white">
        <div className="mx-auto max-w-[1240px] px-5 py-14 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.7fr_0.95fr_1.05fr_0.95fr] lg:gap-8">
            <div>
              <Logo light imageUrl={siteContent.logo.imageUrl || undefined} title={siteContent.logo.title || siteContent.settings.businessName} />
              <p className="mt-5 max-w-[320px] text-[13px] leading-7 text-white/70">
                {siteContent.about.description}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                {safeExternalHref(siteContent.social.facebook) && (
                  <a href={safeExternalHref(siteContent.social.facebook)} target="_blank" rel="noreferrer" aria-label="Visit Amar Printers on Facebook" title="Facebook" className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 hover:text-[#1877F2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e63946]/30">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="currentColor" aria-hidden="true">
                      <path d="M13.5 22v-8.5h2.8l.4-3.2H13.5V4.7c0-.9.3-1.5 1.6-1.5h1.7V.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2.4H7.2v3.2h2.8V22h3.5Z" />
                    </svg>
                  </a>
                )}
                {safeExternalHref(siteContent.social.instagram) && (
                  <a href={safeExternalHref(siteContent.social.instagram)} target="_blank" rel="noreferrer" aria-label="Visit Amar Printers on Instagram" title="Instagram" className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-[#E1306C]/40 hover:bg-[#E1306C]/10 hover:text-[#E1306C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e63946]/30">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="3" width="18" height="18" rx="5" />
                      <circle cx="12" cy="12" r="4.25" />
                      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
                    </svg>
                  </a>
                )}
                {safeExternalHref(siteContent.social.whatsapp) && (
                  <a href={safeExternalHref(siteContent.social.whatsapp)} target="_blank" rel="noreferrer" aria-label="Chat with Amar Printers on WhatsApp" title="WhatsApp" className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-[#25D366]/40 hover:bg-[#25D366]/10 hover:text-[#25D366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e63946]/30">
                    <MessageCircle size={18} />
                  </a>
                )}
                {safeExternalHref(siteContent.contact.googleMapsUrl) && (
                  <a href={safeExternalHref(siteContent.contact.googleMapsUrl)} target="_blank" rel="noreferrer" aria-label="Open Amar Printers on Google Business Profile" title="Google Business Profile" className="group flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-all duration-300 hover:-translate-y-1 hover:border-[#4285F4]/40 hover:bg-[#4285F4]/10 hover:text-[#4285F4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e63946]/30">
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
                      <circle cx="12" cy="11" r="2.5" />
                    </svg>
                  </a>
                )}
              </div>
              {safeExternalHref(siteContent.contact.googleMapsUrl) && (
                <a href={safeExternalHref(siteContent.contact.googleMapsUrl)} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-semibold text-white/75 transition-all duration-300 hover:border-[#e63946]/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e63946]/30">
                  <span>⭐</span> Read Google Reviews
                </a>
              )}
            </div>
            <FooterColumn title="Quick Links" links={visibleNavLinks.map((link) => ({ label: link.label, href: link.href }))} />
              <FooterColumn title="Our Services" links={publicServices.slice(0, 6).map((service) => ({ label: service.name, href: "/services" }))} />
            <div>
              <h3 className="footer-title">Contact Info</h3>
              <div className="mt-5 space-y-3">
                <a href={safeTelHref(siteContent.contact.phone) || "#contact"} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 hover:border-[#e63946]/30 hover:bg-white/10">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e63946]/10 text-[#e63946]">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Phone</p>
                    <p className="mt-1 text-[13px] font-medium text-white/80 group-hover:text-white">{siteContent.contact.phone}</p>
                  </div>
                </a>
                <a href={safeTelHref(siteContent.contact.whatsapp) || "#contact"} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 hover:border-[#e63946]/30 hover:bg-white/10">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e63946]/10 text-[#e63946]">
                    <Phone size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Alternate Phone</p>
                    <p className="mt-1 text-[13px] font-medium text-white/80 group-hover:text-white">{siteContent.contact.whatsapp}</p>
                  </div>
                </a>
                <a href={safeMailtoHref(siteContent.contact.email) || "#contact"} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 hover:border-[#e63946]/30 hover:bg-white/10">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e63946]/10 text-[#e63946]">
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Email</p>
                    <p className="mt-1 text-[13px] font-medium text-white/80 group-hover:text-white">{siteContent.contact.email}</p>
                  </div>
                </a>
                <a href={safeExternalHref(siteContent.contact.googleMapsUrl) || "#contact"} target={safeExternalHref(siteContent.contact.googleMapsUrl) ? "_blank" : undefined} rel={safeExternalHref(siteContent.contact.googleMapsUrl) ? "noreferrer" : undefined} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-300 hover:border-[#e63946]/30 hover:bg-white/10">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#e63946]/10 text-[#e63946]">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Location</p>
                    <p className="mt-1 text-[13px] font-medium text-white/80 group-hover:text-white">{siteContent.contact.address}</p>
                  </div>
                </a>
              </div>
            </div>
            <div>
              <h3 className="footer-title">Business Hours</h3>
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${isBusinessOpenNow ? "bg-[#1ebf4b]/15 text-[#7ae6a0]" : "bg-[#e63946]/15 text-[#ffb7bf]"}`}>
                    {isBusinessOpenNow ? "Open Now" : "Closed Now"}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.2em] text-white/45">Today</span>
                </div>
                <div className="mt-4 space-y-2 text-[13px] leading-7 text-white/70 whitespace-pre-line">
                  <div className="rounded-xl bg-black/10 px-3 py-2 font-medium text-white/85">
                    {siteContent.contact.workingHours}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-[10px] text-white/45 sm:text-[11px]">
          <p>© 2026 Amar Printers. All Rights Reserved.</p>
          <p className="mt-1 text-white/35">Website Designed &amp; Developed by Rahul Antony Fernandes</p>
        </div>
      </footer>

      <a href="tel:+919482486971" className="hero-floating-cta fixed bottom-4 left-4 z-30 flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-[#e63946] text-white shadow-[0_9px_25px_rgba(230,57,70,0.35)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 max-md:bottom-3 max-md:left-3 max-md:h-14 max-md:w-14 sm:bottom-6 sm:left-6" aria-label="Call Amar Printers">
        <Phone size={22} fill="currentColor" />
        <span className="mt-1 text-[9px] font-bold">Call Now</span>
      </a>
      <a href="https://wa.me/919482486971" target="_blank" rel="noreferrer" className="hero-floating-cta fixed bottom-4 right-4 z-30 flex h-[68px] w-[68px] flex-col items-center justify-center rounded-full bg-[#24b43a] text-white shadow-[0_9px_25px_rgba(36,180,58,0.32)] transition-all duration-300 hover:-translate-y-1 hover:scale-105 max-md:bottom-3 max-md:right-3 max-md:h-14 max-md:w-14 sm:bottom-6 sm:right-6" aria-label="Chat on WhatsApp">
        <MessageCircle size={24} fill="currentColor" />
        <span className="mt-1 text-[9px] font-bold">WhatsApp</span>
      </a>
      <a href="#contact" className="fixed right-0 top-[38%] z-30 hidden -translate-y-1/2 rounded-l-[4px] bg-[#e63946] px-3 py-4 text-[11px] font-bold text-white shadow-lg [writing-mode:vertical-rl] md:block">
        <span className="mb-2 inline-block -rotate-90"><Phone size={12} fill="currentColor" /></span> Get in Touch
      </a>

      <AnimatePresence>
        {selectedImage && selectedIndex !== null && (
          <motion.div
            ref={galleryLightboxRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-3 backdrop-blur-sm sm:p-5"
            onClick={() => setSelectedIndex(null)}
          >
            <button className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-5 sm:top-5" onClick={() => setSelectedIndex(null)} aria-label="Close image viewer"><X size={23} /></button>
            <button className="absolute left-3 top-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:left-7" onClick={(event) => { event.stopPropagation(); setSelectedIndex((current) => current === null || filteredGallery.length === 0 ? null : (current - 1 + filteredGallery.length) % filteredGallery.length); }} aria-label="Previous image"><ChevronLeft size={24} /></button>
            <motion.img
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              key={selectedImage.id ?? selectedImage.image}
              src={selectedImage.image || undefined}
              alt={selectedImage.title}
              className="max-h-[84vh] max-w-[88vw] rounded-[20px] object-contain shadow-[0_25px_90px_rgba(0,0,0,0.45)]"
              onClick={(event) => event.stopPropagation()}
            />
            <button className="absolute right-3 top-1/2 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 sm:right-7" onClick={(event) => { event.stopPropagation(); setSelectedIndex((current) => {
              if (current === null || filteredGallery.length === 0) return null;
              return (current + 1) % filteredGallery.length;
            }); }} aria-label="Next image"><ChevronRight size={24} /></button>
            <div className="absolute bottom-5 left-1/2 max-w-[85%] -translate-x-1/2 rounded-full border border-white/15 bg-black/40 px-4 py-2 text-center text-[11px] font-semibold text-white/85 backdrop-blur-sm sm:text-xs">
              {selectedImage.title} · {selectedImage.category}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="footer-title">{title}</h3>
      <div className="mt-4 space-y-2 text-[11px] text-white/65">
        {links.map((link) => <a key={link.label} href={link.href} className="block transition-colors hover:text-white">{link.label}</a>)}
      </div>
    </div>
  );
}

function AdminLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07131d] px-5 text-white">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 border-t-[#e63946] animate-spin" />
        <p className="mt-5 text-sm font-bold">Checking admin session...</p>
      </div>
    </div>
  );
}

function AdminLogin({
  onLogin,
  siteContent,
}: {
  onLogin: (username: string, password: string) => Promise<void>;
  siteContent?: SiteContentState | null;
}) {
  const safeSiteContent = siteContent ?? EMPTY_SITE_CONTENT;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!password) {
      setError("Please enter your password.");
      setIsSubmitting(false);
      return;
    }

    try {
      await onLogin(username.trim(), password);
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message.includes("auth/") ? " could not sign you in. Check the admin account details." : "Incorrect username or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07131d] px-5 py-12">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(230,57,70,0.14),transparent_34%),radial-gradient(circle_at_82%_80%,rgba(244,180,0,0.08),transparent_30%)]" />
      <div className="relative w-full max-w-[410px]">
        <div className="mb-8 flex justify-center"><a href="#home"><Logo imageUrl={safeSiteContent.logo.imageUrl || undefined} title={safeSiteContent.logo.title || safeSiteContent.settings.businessName} /></a></div>
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)] sm:p-9">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fff1f1] text-[#e63946]"><LockKeyhole size={22} /></div>
          <p className="section-kicker mt-6">PRIVATE AREA</p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-[#0f172a]">Admin login</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to manage the Amar Printers gallery.</p>

          <label htmlFor="admin-username" className="mt-7 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Email</label>
          <input id="admin-username" type="email" autoComplete="email" value={username} onChange={(event) => { setUsername(event.target.value); setError(""); }} className="admin-input mt-2" placeholder="Enter your Firebase email" />

          <label htmlFor="admin-password" className="mt-5 block text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500">Password</label>
          <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} className="admin-input mt-2" placeholder="Enter your password" />

          {error && <p className="mt-3 text-[11px] font-semibold text-[#e63946]">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="button-ripple mt-7 inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"><LockKeyhole size={15} /> {isSubmitting ? "Signing in..." : "Login To Admin"}</button>
          <p className="mt-5 text-center text-[10px] text-slate-400">Return to the <a href="#home" className="font-bold text-[#e63946] hover:underline">main website</a></p>
        </form>
      </div>
    </div>
  );
}

export default App;
