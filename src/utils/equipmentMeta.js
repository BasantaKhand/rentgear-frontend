// Shared metadata for equipment categories: display label, icon, and gradient
// used for placeholder images. Keys match the backend enum.
export const CATEGORY_META = {
  cameras: { label: 'Cameras', icon: '📷', gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)' },
  tools: { label: 'Power Tools', icon: '🔧', gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)' },
  sports: { label: 'Sports', icon: '🏀', gradient: 'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)' },
  electronics: { label: 'Electronics', icon: '💻', gradient: 'linear-gradient(135deg,#89f7fe 0%,#66a6ff 100%)' },
  audio: { label: 'Audio', icon: '🎧', gradient: 'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)' },
  lighting: { label: 'Lighting', icon: '💡', gradient: 'linear-gradient(135deg,#d299c2 0%,#fef9d7 100%)' },
};

// Ordered list for filters and category grids
export const CATEGORIES = Object.keys(CATEGORY_META);

export function getCategoryMeta(category) {
  return (
    CATEGORY_META[category] || {
      label: category || 'General',
      icon: '📦',
      gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
    }
  );
}

const API_ORIGIN = (
  import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
).replace(/\/api\/?$/, '');

// Resolve an equipment image field to a usable URL.
// Handles absolute URLs (seed data) and server-relative upload paths.
export function resolveImageUrl(image) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${API_ORIGIN}${image}`;
}
