import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ImagePlus,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Mail,
  MessageSquareText,
  Monitor,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
} from "lucide-react";
import type { User } from "firebase/auth";
import {
  deleteGalleryContent,
  deleteOfferContent,
  deleteServiceContent,
  deleteTestimonialContent,
  saveAboutContent,
  saveContactDetails,
  saveGalleryContent,
  saveHeroContent,
  saveOfferContent,
  saveSeoSettings,
  saveServiceContent,
  saveSiteLogo,
  saveSiteSettings,
  saveSocialLinks,
  saveTestimonialContent,
  saveWhyChooseContent,
  updateEnquiryStatus,
  deleteEnquiry,
  type AboutContent,
  type ContactDetails,
  type EnquiryRecord,
  type GalleryContent,
  type HeroContent,
  type OfferContent,
  type SeoSettings,
  type SiteLogoContent,
  type SiteSettingsContent,
  type ServiceContent,
  type SocialLinks,
  type TestimonialContent,
  type WhyChooseContent,
} from "./contentService";
import { isFirebaseConfigured } from "./firebase";
import { describeCmsPermissionError, safeImageUrl } from "./utils/security";

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

type AdminDashboardProps = {
  siteContent: SiteContentState;
  setSiteContent: React.Dispatch<React.SetStateAction<SiteContentState>>;
  firebaseUser: User | null;
  onLogout: () => void | Promise<void>;
};

type ModuleKey = "overview" | "hero" | "about" | "whyChoose" | "services" | "gallery" | "offers" | "testimonials" | "contact" | "settings" | "logo" | "seo" | "social" | "enquiries";

const moduleLabels: Record<ModuleKey, string> = {
  overview: "Overview",
  hero: "Hero",
  about: "About",
  whyChoose: "Why Choose",
  services: "Services",
  gallery: "Gallery",
  offers: "Offers",
  testimonials: "Testimonials",
  contact: "Contact",
  settings: "Settings",
  logo: "Logo",
  seo: "SEO",
  social: "Social",
  enquiries: "Enquiries",
};

function AdminDashboard({ siteContent, setSiteContent, firebaseUser, onLogout }: AdminDashboardProps) {
  const [activeModule, setActiveModule] = useState<ModuleKey>("overview");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const aboutFileInputRef = useRef<HTMLInputElement>(null);
  const whyChooseFileInputRef = useRef<HTMLInputElement>(null);
  const serviceFileInputRef = useRef<HTMLInputElement>(null);
  const galleryFileInputRef = useRef<HTMLInputElement>(null);
  const offerFileInputRef = useRef<HTMLInputElement>(null);
  const testimonialFileInputRef = useRef<HTMLInputElement>(null);

  const [heroForm, setHeroForm] = useState(siteContent.hero);
  const [aboutForm, setAboutForm] = useState(siteContent.about);
  const [whyChooseForm, setWhyChooseForm] = useState(siteContent.whyChoose);
  const [whyChooseFile, setWhyChooseFile] = useState<File | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceContent>({ title: "", description: "", imageUrl: "" });
  const [serviceFile, setServiceFile] = useState<File | null>(null);
  const [servicePreviewUrl, setServicePreviewUrl] = useState("");
  const [serviceEditingId, setServiceEditingId] = useState<string | null>(null);
  const [galleryForm, setGalleryForm] = useState<GalleryContent>({ title: "", category: "Business Cards", imageUrl: "" });
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryEditingId, setGalleryEditingId] = useState<string | null>(null);
  const [offerForm, setOfferForm] = useState<OfferContent>({ title: "", description: "", imageUrl: "", active: true });
  const [offerFile, setOfferFile] = useState<File | null>(null);
  const [offerEditingId, setOfferEditingId] = useState<string | null>(null);
  const [testimonialForm, setTestimonialForm] = useState<TestimonialContent>({ name: "", review: "", rating: 5, imageUrl: "" });
  const [testimonialFile, setTestimonialFile] = useState<File | null>(null);
  const [testimonialEditingId, setTestimonialEditingId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState(siteContent.contact);
  const [settingsForm, setSettingsForm] = useState(siteContent.settings);
  const [logoForm, setLogoForm] = useState(siteContent.logo);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [seoForm, setSeoForm] = useState(siteContent.seo);
  const [socialForm, setSocialForm] = useState(siteContent.social);

  const overviewStats = useMemo(() => [
    { label: "Services", value: siteContent.services.length },
    { label: "Gallery", value: siteContent.gallery.length },
    { label: "Offers", value: siteContent.offers.filter((item) => item.active).length },
    { label: "Enquiries", value: siteContent.enquiries.length },
  ], [siteContent]);

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const getSaveErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("permission") || message.includes("insufficient permissions")) {
        return describeCmsPermissionError(error);
      }
      if (message.includes("secure image upload") || message.includes("cloudinary") || message.includes("image upload failed") || message.includes("unsupported file type") || message.includes("file is too large")) {
        return error.message;
      }
      return error.message;
    }
    return fallback;
  };

  const handleFilePreview = (event: ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setter(file);
  };

  const handleServiceFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setServiceFile(file);
    setServicePreviewUrl(URL.createObjectURL(file));
  };

  useEffect(() => () => {
    if (servicePreviewUrl.startsWith("blob:")) URL.revokeObjectURL(servicePreviewUrl);
  }, [servicePreviewUrl]);

  const handleHeroSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedHero = await saveHeroContent(heroForm, heroFileInputRef.current?.files?.[0]);
      setSiteContent((current) => ({ ...current, hero: savedHero }));
      setHeroForm(savedHero);
      setMessage("Hero content updated successfully.");
      if (heroFileInputRef.current) heroFileInputRef.current.value = "";
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError, "Could not update hero content."));
    } finally {
      setLoading(false);
    }
  };

  const handleAboutSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedAbout = await saveAboutContent(aboutForm, aboutFileInputRef.current?.files?.[0]);
      setSiteContent((current) => ({ ...current, about: savedAbout }));
      setAboutForm(savedAbout);
      setMessage("About content updated successfully.");
      if (aboutFileInputRef.current) aboutFileInputRef.current.value = "";
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError, "Could not update about content."));
    } finally {
      setLoading(false);
    }
  };

  const handleWhyChooseSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedWhyChoose = await saveWhyChooseContent(whyChooseForm, whyChooseFile ?? undefined);
      setSiteContent((current) => ({ ...current, whyChoose: savedWhyChoose }));
      setWhyChooseForm(savedWhyChoose);
      setWhyChooseFile(null);
      setMessage("Why choose section updated successfully.");
      if (whyChooseFileInputRef.current) whyChooseFileInputRef.current.value = "";
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError, "Could not update the Why Choose section."));
    } finally {
      setLoading(false);
    }
  };

  const handleServiceSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedService = await saveServiceContent({ ...serviceForm, id: serviceEditingId ?? undefined }, serviceFile ?? undefined);
      setSiteContent((current) => ({
        ...current,
        services: serviceEditingId
          ? current.services.map((item) => (item.id === serviceEditingId ? { ...item, ...savedService } : item))
          : [{ ...savedService, id: savedService.id }, ...current.services],
      }));
      setServiceForm({ title: "", description: "", imageUrl: "" });
      setServicePreviewUrl("");
      setServiceEditingId(null);
      setServiceFile(null);
      if (serviceFileInputRef.current) serviceFileInputRef.current.value = "";
      setMessage(serviceEditingId ? "Service updated." : "Service added.");
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError, "Could not save the service."));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteService = async (service: ServiceContent) => {
    clearFeedback();
    setLoading(true);
    try {
      await deleteServiceContent(service.id, service.storagePath);
      setSiteContent((current) => ({ ...current, services: current.services.filter((item) => item.id !== service.id) }));
      setMessage("Service removed.");
    } catch (saveError) {
      setError(getSaveErrorMessage(saveError, "Could not remove the service."));
    } finally {
      setLoading(false);
    }
  };

  const handleGallerySave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedItem = await saveGalleryContent({ ...galleryForm, id: galleryEditingId ?? undefined }, galleryFile ?? undefined);
      setSiteContent((current) => ({
        ...current,
        gallery: galleryEditingId
          ? current.gallery.map((item) => (item.id === galleryEditingId ? { ...item, ...savedItem } : item))
          : [{ ...savedItem, id: savedItem.id }, ...current.gallery],
      }));
      setGalleryForm({ title: "", category: "Business Cards", imageUrl: "" });
      setGalleryEditingId(null);
      setGalleryFile(null);
      if (galleryFileInputRef.current) galleryFileInputRef.current.value = "";
      setMessage(galleryEditingId ? "Gallery image updated." : "Gallery image added.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the gallery image.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGallery = async (item: GalleryContent) => {
    clearFeedback();
    setLoading(true);
    try {
      await deleteGalleryContent(item.id, item.storagePath);
      setSiteContent((current) => ({ ...current, gallery: current.gallery.filter((entry) => entry.id !== item.id) }));
      setMessage("Gallery image removed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not remove the gallery image.");
    } finally {
      setLoading(false);
    }
  };

  const handleOfferSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedOffer = await saveOfferContent({ ...offerForm, id: offerEditingId ?? undefined }, offerFile ?? undefined);
      setSiteContent((current) => ({
        ...current,
        offers: offerEditingId
          ? current.offers.map((item) => (item.id === offerEditingId ? { ...item, ...savedOffer } : item))
          : [{ ...savedOffer, id: savedOffer.id }, ...current.offers],
      }));
      setOfferForm({ title: "", description: "", imageUrl: "", active: true });
      setOfferEditingId(null);
      setOfferFile(null);
      if (offerFileInputRef.current) offerFileInputRef.current.value = "";
      setMessage(offerEditingId ? "Offer updated." : "Offer added.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the offer.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (offer: OfferContent) => {
    clearFeedback();
    setLoading(true);
    try {
      await deleteOfferContent(offer.id, offer.storagePath);
      setSiteContent((current) => ({ ...current, offers: current.offers.filter((item) => item.id !== offer.id) }));
      setMessage("Offer removed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not remove the offer.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestimonialSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedTestimonial = await saveTestimonialContent({ ...testimonialForm, id: testimonialEditingId ?? undefined }, testimonialFile ?? undefined);
      setSiteContent((current) => ({
        ...current,
        testimonials: testimonialEditingId
          ? current.testimonials.map((item) => (item.id === testimonialEditingId ? { ...item, ...savedTestimonial } : item))
          : [{ ...savedTestimonial, id: savedTestimonial.id }, ...current.testimonials],
      }));
      setTestimonialForm({ name: "", review: "", rating: 5, imageUrl: "" });
      setTestimonialEditingId(null);
      setTestimonialFile(null);
      if (testimonialFileInputRef.current) testimonialFileInputRef.current.value = "";
      setMessage(testimonialEditingId ? "Testimonial updated." : "Testimonial added.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the testimonial.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTestimonial = async (testimonial: TestimonialContent) => {
    clearFeedback();
    setLoading(true);
    try {
      await deleteTestimonialContent(testimonial.id, testimonial.storagePath);
      setSiteContent((current) => ({ ...current, testimonials: current.testimonials.filter((item) => item.id !== testimonial.id) }));
      setMessage("Testimonial removed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not remove the testimonial.");
    } finally {
      setLoading(false);
    }
  };

  const handleContactSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedContact = await saveContactDetails(contactForm);
      setSiteContent((current) => ({ ...current, contact: savedContact }));
      setContactForm(savedContact);
      setMessage("Contact details updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the contact details.");
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedSettings = await saveSiteSettings(settingsForm);
      setSiteContent((current) => ({ ...current, settings: savedSettings }));
      setSettingsForm(savedSettings);
      setMessage("Site settings updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the site settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedLogo = await saveSiteLogo(logoForm, logoFile ?? undefined);
      setSiteContent((current) => ({ ...current, logo: savedLogo }));
      setLogoForm(savedLogo);
      setLogoFile(null);
      setMessage("Logo updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the logo.");
    } finally {
      setLoading(false);
    }
  };

  const handleSeoSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedSeo = await saveSeoSettings(seoForm);
      setSiteContent((current) => ({ ...current, seo: savedSeo }));
      setSeoForm(savedSeo);
      setMessage("SEO settings updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the SEO settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSave = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setLoading(true);
    try {
      const savedSocial = await saveSocialLinks(socialForm);
      setSiteContent((current) => ({ ...current, social: savedSocial }));
      setSocialForm(savedSocial);
      setMessage("Social links updated.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the social links.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnquiryAction = async (item: EnquiryRecord, completed: boolean) => {
    clearFeedback();
    setLoading(true);
    try {
      await updateEnquiryStatus(item.id!, completed);
      setSiteContent((current) => ({ ...current, enquiries: current.enquiries.map((entry) => (entry.id === item.id ? { ...entry, completed } : entry)) }));
      setMessage(completed ? "Enquiry marked as completed." : "Enquiry reopened.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update the enquiry.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnquiry = async (item: EnquiryRecord) => {
    clearFeedback();
    setLoading(true);
    try {
      await deleteEnquiry(item.id!);
      setSiteContent((current) => ({ ...current, enquiries: current.enquiries.filter((entry) => entry.id !== item.id) }));
      setMessage("Enquiry removed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not delete the enquiry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] text-[#0f172a]">
      <header className="border-b border-white/10 bg-[#05070b] text-white shadow-[0_6px_30px_rgba(15,23,42,0.15)]">
        <div className="mx-auto flex h-[70px] max-w-[1400px] items-center justify-between px-5 lg:px-8">
          <div>
            <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-[#f4b400]">AMAR PRINTERS</p>
            <h1 className="text-lg font-black tracking-[-0.03em]">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-white/10 px-3 py-2 text-[11px] font-semibold text-white/80 sm:block">{firebaseUser?.email ?? "Admin"}</span>
            <button onClick={() => void onLogout()} className="inline-flex items-center gap-2 rounded-[4px] border border-white/20 px-3.5 py-2 text-[11px] font-bold transition hover:border-white/50 hover:bg-white/10" type="button">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] gap-6 px-5 py-8 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-3 rounded-2xl bg-[#fff1f1] p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e63946] text-white"><LayoutDashboard size={18} /></div>
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#e63946]">CMS</p>
              <p className="text-sm font-black">Manage your website</p>
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {(Object.keys(moduleLabels) as ModuleKey[]).map((module) => (
              <button
                key={module}
                type="button"
                onClick={() => setActiveModule(module)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activeModule === module ? "bg-[#e63946] text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <span>{moduleLabels[module]}</span>
                <ChevronRight size={15} />
              </button>
            ))}
          </nav>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[12px] leading-6 text-slate-600">
            <p className="font-extrabold text-slate-800">Firebase status</p>
            <p className="mt-2">{isFirebaseConfigured ? "Connected to Firestore and Storage." : "Local mode active. Configure Firebase to persist content."}</p>
          </div>
        </aside>

        <section className="space-y-6">
          {message && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#1ebf4b]/20 bg-[#f1fdf4] px-4 py-3 text-[12px] font-semibold text-[#1b7a35]">
              <CheckCircle2 size={16} /> {message}
            </div>
          )}
          {error && (
            <div className="flex items-center gap-2 rounded-2xl border border-[#e63946]/20 bg-[#fff7f8] px-4 py-3 text-[12px] font-semibold text-[#b42318]">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {activeModule === "overview" && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {overviewStats.map((item) => (
                <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-slate-500">{item.label}</p>
                  <p className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#111827]">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {activeModule === "hero" && (
            <form onSubmit={handleHeroSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Hero section</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Update homepage hero content</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><Monitor size={18} /></div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-600">Heading<input value={heroForm.heading} onChange={(event) => setHeroForm((current) => ({ ...current, heading: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">CTA text<input value={heroForm.ctaText} onChange={(event) => setHeroForm((current) => ({ ...current, ctaText: event.target.value }))} className="admin-input mt-2" /></label>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Subtitle<textarea value={heroForm.subtitle} onChange={(event) => setHeroForm((current) => ({ ...current, subtitle: event.target.value }))} rows={4} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">CTA link<input value={heroForm.ctaLink} onChange={(event) => setHeroForm((current) => ({ ...current, ctaLink: event.target.value }))} className="admin-input mt-2" /></label>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Upload size={16} /> Upload hero background image</div>
                <input ref={heroFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm" />
                {safeImageUrl(heroForm.imageUrl) && <img src={safeImageUrl(heroForm.imageUrl)} alt="Hero preview" className="mt-4 aspect-[1.8] w-full rounded-xl object-cover" />}
              </div>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save hero section"}</button>
            </form>
          )}

          {activeModule === "about" && (
            <form onSubmit={handleAboutSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">About section</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Edit the about content</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><ShieldCheck size={18} /></div>
              </div>
              <label className="mt-5 block text-sm font-semibold text-slate-600">Heading<input value={aboutForm.heading} onChange={(event) => setAboutForm((current) => ({ ...current, heading: event.target.value }))} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Description<textarea value={aboutForm.description} onChange={(event) => setAboutForm((current) => ({ ...current, description: event.target.value }))} rows={6} className="admin-input mt-2" /></label>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Upload size={16} /> Upload about image</div>
                <input ref={aboutFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm" />
                {safeImageUrl(aboutForm.imageUrl) && <img src={safeImageUrl(aboutForm.imageUrl)} alt="About preview" className="mt-4 aspect-[1.1] w-full rounded-xl object-cover" />}
              </div>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save about section"}</button>
            </form>
          )}

          {activeModule === "whyChoose" && (
            <form onSubmit={handleWhyChooseSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Why choose us</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Edit the Why Choose section</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><ListChecks size={18} /></div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-600">Title<input value={whyChooseForm.title} onChange={(event) => setWhyChooseForm((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">Subtitle<input value={whyChooseForm.subtitle} onChange={(event) => setWhyChooseForm((current) => ({ ...current, subtitle: event.target.value }))} className="admin-input mt-2" /></label>
              </div>

              <label className="mt-4 block text-sm font-semibold text-slate-600">Description<textarea value={whyChooseForm.description} onChange={(event) => setWhyChooseForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Image URL<input value={whyChooseForm.imageUrl} onChange={(event) => setWhyChooseForm((current) => ({ ...current, imageUrl: event.target.value }))} className="admin-input mt-2" /></label>

              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Upload size={16} /> Upload Why Choose image</div>
                <input ref={whyChooseFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm" onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setWhyChooseFile(file);
                }} />
                {safeImageUrl(whyChooseForm.imageUrl) && <img src={safeImageUrl(whyChooseForm.imageUrl)} alt="Why Choose preview" className="mt-4 aspect-[1.1] w-full rounded-xl object-cover" />}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-slate-800">Feature list</p>
                  <button type="button" onClick={() => setWhyChooseForm((current) => ({ ...current, items: [...current.items, { title: "", description: "", icon: "ShieldCheck" }] }))} className="rounded-full border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2 text-[11px] font-bold text-[#e63946]">Add item</button>
                </div>

                <div className="mt-4 space-y-4">
                  {whyChooseForm.items.map((item, index) => (
                    <div key={`${item.title || "item"}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_0.8fr]">
                        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Title<input value={item.title} onChange={(event) => setWhyChooseForm((current) => ({ ...current, items: current.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry) }))} className="admin-input mt-2" /></label>
                        <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Icon name<input value={item.icon ?? ""} onChange={(event) => setWhyChooseForm((current) => ({ ...current, items: current.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, icon: event.target.value } : entry) }))} className="admin-input mt-2" placeholder="ShieldCheck" /></label>
                        <div className="flex items-end">
                          <button type="button" onClick={() => setWhyChooseForm((current) => ({ ...current, items: current.items.filter((_, entryIndex) => entryIndex !== index) }))} className="w-full rounded-[4px] border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2.5 text-[11px] font-bold text-[#e63946]">Remove</button>
                        </div>
                      </div>
                      <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Description<textarea value={item.description} onChange={(event) => setWhyChooseForm((current) => ({ ...current, items: current.items.map((entry, entryIndex) => entryIndex === index ? { ...entry, description: event.target.value } : entry) }))} rows={3} className="admin-input mt-2" /></label>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save Why Choose section"}</button>
            </form>
          )}

          {activeModule === "services" && (
            <div className="space-y-6">
              <form onSubmit={handleServiceSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Services</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Add or edit services</h2>
                  </div>
                  <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><Sparkles size={18} /></div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-600">Title<input value={serviceForm.title} onChange={(event) => setServiceForm((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-2" /></label>
                  <label className="block text-sm font-semibold text-slate-600">Image URL<input value={serviceForm.imageUrl} onChange={(event) => setServiceForm((current) => ({ ...current, imageUrl: event.target.value }))} className="admin-input mt-2" /></label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-600">Description<textarea value={serviceForm.description} onChange={(event) => setServiceForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="admin-input mt-2" /></label>
                <input ref={serviceFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-4 block w-full text-sm" onChange={handleServiceFileChange} />
                {safeImageUrl(servicePreviewUrl || serviceForm.imageUrl) && <img src={safeImageUrl(servicePreviewUrl || serviceForm.imageUrl)} alt="Service preview" className="mt-4 aspect-[1.16] w-full rounded-xl object-cover" />}
                <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : serviceEditingId ? "Update service" : "Add service"}</button>
              </form>

              <div className="grid gap-4 md:grid-cols-2">
                {siteContent.services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                    {safeImageUrl(service.imageUrl) && <img src={safeImageUrl(service.imageUrl)} alt={service.title} className="mb-4 aspect-[1.16] w-full rounded-xl object-cover" />}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">{service.title}</p>
                        <p className="mt-1 text-[12px] leading-6 text-slate-600">{service.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setServiceForm(service); setServicePreviewUrl(service.imageUrl); setServiceEditingId(service.id ?? null); setActiveModule("services"); }} className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700">Edit</button>
                        <button type="button" onClick={() => void handleDeleteService(service)} className="rounded-full border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2 text-[11px] font-bold text-[#e63946]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModule === "gallery" && (
            <div className="space-y-6">
              <form onSubmit={handleGallerySave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Gallery</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Manage portfolio images</h2>
                  </div>
                  <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><ImagePlus size={18} /></div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-600">Title<input value={galleryForm.title} onChange={(event) => setGalleryForm((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-2" /></label>
                  <label className="block text-sm font-semibold text-slate-600">Category<input value={galleryForm.category} onChange={(event) => setGalleryForm((current) => ({ ...current, category: event.target.value }))} className="admin-input mt-2" /></label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-600">Image URL<input value={galleryForm.imageUrl} onChange={(event) => setGalleryForm((current) => ({ ...current, imageUrl: event.target.value }))} className="admin-input mt-2" /></label>
                <input ref={galleryFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-4 block w-full text-sm" onChange={(event) => handleFilePreview(event, setGalleryFile)} />
                <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : galleryEditingId ? "Update image" : "Add image"}</button>
              </form>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {siteContent.gallery.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                    {safeImageUrl(item.imageUrl) && <img src={safeImageUrl(item.imageUrl)} alt={item.title} className="aspect-[1.1] w-full rounded-xl object-cover" />}
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">{item.title}</p>
                        <p className="mt-1 text-[11px] font-semibold text-[#e63946]">{item.category}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setGalleryForm(item); setGalleryEditingId(item.id ?? null); setActiveModule("gallery"); }} className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700">Edit</button>
                        <button type="button" onClick={() => void handleDeleteGallery(item)} className="rounded-full border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2 text-[11px] font-bold text-[#e63946]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModule === "offers" && (
            <div className="space-y-6">
              <form onSubmit={handleOfferSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Offers</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Manage active promotions</h2>
                  </div>
                  <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><ListChecks size={18} /></div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-600">Title<input value={offerForm.title} onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))} className="admin-input mt-2" /></label>
                  <label className="block text-sm font-semibold text-slate-600">Status<select value={offerForm.active ? "active" : "inactive"} onChange={(event) => setOfferForm((current) => ({ ...current, active: event.target.value === "active" }))} className="admin-input mt-2"><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-600">Description<textarea value={offerForm.description} onChange={(event) => setOfferForm((current) => ({ ...current, description: event.target.value }))} rows={4} className="admin-input mt-2" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-600">Image URL<input value={offerForm.imageUrl} onChange={(event) => setOfferForm((current) => ({ ...current, imageUrl: event.target.value }))} className="admin-input mt-2" /></label>
                <input ref={offerFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-4 block w-full text-sm" onChange={(event) => handleFilePreview(event, setOfferFile)} />
                <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : offerEditingId ? "Update offer" : "Add offer"}</button>
              </form>

              <div className="grid gap-4 md:grid-cols-2">
                {siteContent.offers.map((offer) => (
                  <div key={offer.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">{offer.title}</p>
                        <p className="mt-1 text-[12px] leading-6 text-slate-600">{offer.description}</p>
                        <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#e63946]">{offer.active ? "Active" : "Inactive"}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setOfferForm(offer); setOfferEditingId(offer.id ?? null); setActiveModule("offers"); }} className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700">Edit</button>
                        <button type="button" onClick={() => void handleDeleteOffer(offer)} className="rounded-full border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2 text-[11px] font-bold text-[#e63946]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModule === "testimonials" && (
            <div className="space-y-6">
              <form onSubmit={handleTestimonialSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Testimonials</p>
                    <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Add customer reviews</h2>
                  </div>
                  <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><MessageSquareText size={18} /></div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-600">Customer name<input value={testimonialForm.name} onChange={(event) => setTestimonialForm((current) => ({ ...current, name: event.target.value }))} className="admin-input mt-2" /></label>
                  <label className="block text-sm font-semibold text-slate-600">Rating<select value={testimonialForm.rating} onChange={(event) => setTestimonialForm((current) => ({ ...current, rating: Number(event.target.value) }))} className="admin-input mt-2"><option value={5}>5</option><option value={4}>4</option><option value={3}>3</option><option value={2}>2</option><option value={1}>1</option></select></label>
                </div>
                <label className="mt-4 block text-sm font-semibold text-slate-600">Review<textarea value={testimonialForm.review} onChange={(event) => setTestimonialForm((current) => ({ ...current, review: event.target.value }))} rows={4} className="admin-input mt-2" /></label>
                <label className="mt-4 block text-sm font-semibold text-slate-600">Image URL<input value={testimonialForm.imageUrl ?? ""} onChange={(event) => setTestimonialForm((current) => ({ ...current, imageUrl: event.target.value }))} className="admin-input mt-2" /></label>
                <input ref={testimonialFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="mt-4 block w-full text-sm" onChange={(event) => handleFilePreview(event, setTestimonialFile)} />
                <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : testimonialEditingId ? "Update testimonial" : "Add testimonial"}</button>
              </form>

              <div className="grid gap-4 md:grid-cols-2">
                {siteContent.testimonials.map((testimonial) => (
                  <div key={testimonial.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-extrabold">{testimonial.name}</p>
                        <p className="mt-1 text-[12px] leading-6 text-slate-600">{testimonial.review}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { setTestimonialForm(testimonial); setTestimonialEditingId(testimonial.id ?? null); setActiveModule("testimonials"); }} className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700">Edit</button>
                        <button type="button" onClick={() => void handleDeleteTestimonial(testimonial)} className="rounded-full border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2 text-[11px] font-bold text-[#e63946]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeModule === "contact" && (
            <form onSubmit={handleContactSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Contact details</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Update business contact information</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><Phone size={18} /></div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-600">Business name<input value={contactForm.businessName} onChange={(event) => setContactForm((current) => ({ ...current, businessName: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">Phone<input value={contactForm.phone} onChange={(event) => setContactForm((current) => ({ ...current, phone: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">WhatsApp<input value={contactForm.whatsapp} onChange={(event) => setContactForm((current) => ({ ...current, whatsapp: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">Email<input value={contactForm.email} onChange={(event) => setContactForm((current) => ({ ...current, email: event.target.value }))} className="admin-input mt-2" /></label>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Address<textarea value={contactForm.address} onChange={(event) => setContactForm((current) => ({ ...current, address: event.target.value }))} rows={3} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Google Maps link<input value={contactForm.googleMapsUrl} onChange={(event) => setContactForm((current) => ({ ...current, googleMapsUrl: event.target.value }))} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Working hours<textarea value={contactForm.workingHours} onChange={(event) => setContactForm((current) => ({ ...current, workingHours: event.target.value }))} rows={3} className="admin-input mt-2" /></label>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save contact details"}</button>
            </form>
          )}

          {activeModule === "settings" && (
            <form onSubmit={handleSettingsSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Site settings</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Update branding and site details</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><Monitor size={18} /></div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-600">Business name<input value={settingsForm.businessName} onChange={(event) => setSettingsForm((current) => ({ ...current, businessName: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">Theme color<input value={settingsForm.themeColor} onChange={(event) => setSettingsForm((current) => ({ ...current, themeColor: event.target.value }))} className="admin-input mt-2" /></label>
              </div>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Tagline<input value={settingsForm.tagline} onChange={(event) => setSettingsForm((current) => ({ ...current, tagline: event.target.value }))} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Copyright<textarea value={settingsForm.copyright} onChange={(event) => setSettingsForm((current) => ({ ...current, copyright: event.target.value }))} rows={3} className="admin-input mt-2" /></label>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save site settings"}</button>
            </form>
          )}

          {activeModule === "logo" && (
            <form onSubmit={handleLogoSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Logo management</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Upload or replace your website logo</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><ImagePlus size={18} /></div>
              </div>
              <label className="mt-5 block text-sm font-semibold text-slate-600">Logo title<input value={logoForm.title ?? ""} onChange={(event) => setLogoForm((current) => ({ ...current, title: event.target.value, imageUrl: current.imageUrl }))} className="admin-input mt-2" /></label>
              <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Upload size={16} /> Upload logo</div>
                <input type="file" accept="image/png,image/jpeg,image/webp" className="mt-3 block w-full text-sm" onChange={(event) => { const file = event.target.files?.[0]; if (file) setLogoFile(file); }} />
                {safeImageUrl(logoForm.imageUrl) && <img src={safeImageUrl(logoForm.imageUrl)} alt="Logo preview" className="mt-4 h-20 w-auto rounded-xl object-contain" />}
              </div>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save logo"}</button>
            </form>
          )}

          {activeModule === "seo" && (
            <form onSubmit={handleSeoSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">SEO settings</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Update search engine metadata</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><Search size={18} /></div>
              </div>
              <label className="mt-5 block text-sm font-semibold text-slate-600">Meta title<input value={seoForm.metaTitle} onChange={(event) => setSeoForm((current) => ({ ...current, metaTitle: event.target.value }))} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Meta description<textarea value={seoForm.metaDescription} onChange={(event) => setSeoForm((current) => ({ ...current, metaDescription: event.target.value }))} rows={4} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Keywords<input value={seoForm.keywords} onChange={(event) => setSeoForm((current) => ({ ...current, keywords: event.target.value }))} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Open Graph image<input value={seoForm.ogImage} onChange={(event) => setSeoForm((current) => ({ ...current, ogImage: event.target.value }))} className="admin-input mt-2" /></label>
              <label className="mt-4 block text-sm font-semibold text-slate-600">Canonical URL<input value={seoForm.canonicalUrl} onChange={(event) => setSeoForm((current) => ({ ...current, canonicalUrl: event.target.value }))} className="admin-input mt-2" /></label>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save SEO"}</button>
            </form>
          )}

          {activeModule === "social" && (
            <form onSubmit={handleSocialSave} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Social media</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Link your social platforms</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><Mail size={18} /></div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-600">Facebook<input value={socialForm.facebook} onChange={(event) => setSocialForm((current) => ({ ...current, facebook: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">Instagram<input value={socialForm.instagram} onChange={(event) => setSocialForm((current) => ({ ...current, instagram: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">WhatsApp<input value={socialForm.whatsapp} onChange={(event) => setSocialForm((current) => ({ ...current, whatsapp: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">YouTube<input value={socialForm.youtube} onChange={(event) => setSocialForm((current) => ({ ...current, youtube: event.target.value }))} className="admin-input mt-2" /></label>
                <label className="block text-sm font-semibold text-slate-600">LinkedIn<input value={socialForm.linkedin} onChange={(event) => setSocialForm((current) => ({ ...current, linkedin: event.target.value }))} className="admin-input mt-2" /></label>
              </div>
              <button type="submit" disabled={loading} className="button-ripple mt-5 inline-flex items-center gap-2 rounded-[4px] bg-[#e63946] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#c92d3a]">{loading ? "Saving..." : "Save socials"}</button>
            </form>
          )}

          {activeModule === "enquiries" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_35px_rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#e63946]">Enquiries</p>
                  <h2 className="mt-1 text-2xl font-black tracking-[-0.04em]">Review customer requests</h2>
                </div>
                <div className="rounded-full bg-[#fff1f1] p-2 text-[#e63946]"><ListChecks size={18} /></div>
              </div>
              <div className="mt-5 space-y-3">
                {siteContent.enquiries.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="text-sm font-extrabold">{item.name}</p>
                        <p className="mt-1 text-[12px] leading-6 text-slate-600">{item.service} · {item.phone} · {item.email}</p>
                        <p className="mt-2 text-[12px] leading-6 text-slate-700">{item.message}</p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => void handleEnquiryAction(item, !item.completed)} className="rounded-full border border-slate-300 px-3 py-2 text-[11px] font-bold text-slate-700">{item.completed ? "Reopen" : "Complete"}</button>
                        <button type="button" onClick={() => void handleDeleteEnquiry(item)} className="rounded-full border border-[#e63946]/20 bg-[#fff7f8] px-3 py-2 text-[11px] font-bold text-[#e63946]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
