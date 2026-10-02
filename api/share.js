const SUPABASE_URL =
  "https://qleoqpmxvmqcythacszw.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_-rvHVSnw6yw0_Zb-jxozVw_Fma9NccJ";

const BASE = "https://www.nexoranews.uk";
const DEFAULT_IMAGE = BASE + "/og-image.jpg";
const DEFAULT_DESC = "Read the latest news and stories from Nexora News.";

const COLUMNS = "title,slug,excerpt,image_url,category,author,published_at,created_at";

function makeSlug(title) {
  return String(title || "")
    .toLowerCase()
    .replace(/ɗ/g, "d")
    .replace(/ƙ/g, "k")
    .replace(/ɓ/g, "b")
    .replace(/ƴ/g, "y")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")