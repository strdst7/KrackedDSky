/* Crisp colorful vector SVG icons (zero platform-dependent emoji tofu!) */
import { ITEMS } from "../game/items";

export function ItemSvg({ index, size = 22 }: { index: number; size?: number }) {
  const def = ITEMS[index] || ITEMS[0];
  switch (def.id) {
    case "coffee":
      // Frothy Teh Tarik cup
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <rect x="6" y="9" width="16" height="17" rx="3.5" fill="#f5efe6" />
          <rect x="8" y="13" width="12" height="11" rx="2" fill="#a66c44" />
          <ellipse cx="14" cy="12" rx="6.5" ry="2.6" fill="#fffdf9" />
          <path d="M22 13h2.5a3 3 0 0 1 0 6H22" stroke="#e5dccf" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      );
    case "juice":
      // Tropical Mango Juice glass
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M9 7h14l-1.6 19a2 2 0 0 1-2 1.8h-6.8a2 2 0 0 1-2-1.8L9 7z" fill="#e6f4ff" fillOpacity="0.85" />
          <path d="M10.2 12h11.6l-1.1 13.2a1 1 0 0 1-1 .9h-7.4a1 1 0 0 1-1-.9L10.2 12z" fill="#ff9f2e" />
          <path d="M17 12l4-8" stroke="#ff595e" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "soda":
      // Pink Rose Sirap Bandung glass
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M9 7h14l-1.6 19a2 2 0 0 1-2 1.8h-6.8a2 2 0 0 1-2-1.8L9 7z" fill="#e8f4ff" fillOpacity="0.85" />
          <path d="M10.2 11h11.6l-1.1 14.2a1 1 0 0 1-1 .9h-7.4a1 1 0 0 1-1-.9L10.2 11z" fill="#ff6b9d" />
          <path d="M17 11l3.5-7" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "champagne":
      // Sparkling Gold Flute
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <path d="M11 5h10l-3.2 12.5a1.8 1.8 0 0 1-3.6 0L11 5z" fill="#ffe699" />
          <path d="M11.8 8h8.4l-2.4 9.2a1.8 1.8 0 0 1-3.6 0L11.8 8z" fill="#ffd147" />
          <path d="M16 18v8M11.5 26.5h9" stroke="#f5c451" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "chicken":
      // Nasi Lemak on Banana Leaf
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="11.5" fill="#f2f6fc" />
          <circle cx="16" cy="16.5" r="8.5" fill="#2a7b46" />
          <circle cx="14" cy="15.5" r="4.6" fill="#fffdf7" />
          <circle cx="19.8" cy="17.5" r="3.1" fill="#d63826" />
          <ellipse cx="18.5" cy="12.5" rx="2.5" ry="1.8" fill="#fff3bf" />
        </svg>
      );
    case "pasta":
      // Satay Platter with Peanut Sauce
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="11.5" fill="#f2f6fc" />
          <circle cx="16" cy="16" r="8.5" fill="#2a7b46" />
          <rect x="8.5" y="11" width="11" height="2.6" rx="1.3" fill="#d48c35" />
          <rect x="8.5" y="15" width="11" height="2.6" rx="1.3" fill="#c47c29" />
          <rect x="8.5" y="19" width="11" height="2.6" rx="1.3" fill="#d48c35" />
          <circle cx="21.5" cy="16" r="2.8" fill="#8f4a1e" />
        </svg>
      );
    case "snack":
      // Pandan Kuih Seri Muka Box
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <rect x="6" y="7" width="20" height="18" rx="4" fill="#f7e8c8" />
          <rect x="9" y="10" width="14" height="6" rx="2" fill="#2ec486" />
          <rect x="9" y="16" width="14" height="6" rx="2" fill="#fffdf7" />
        </svg>
      );
    case "pillow":
    default:
      // Embroidered Silk Pillow
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <rect x="5" y="9" width="22" height="14" rx="5" fill="#e8eef9" />
          <rect x="13.5" y="9" width="5" height="14" fill="#178577" />
          <circle cx="16" cy="16" r="1.5" fill="#ffd75e" />
        </svg>
      );
  }
}

export function HibiscusDot({ color = "#ff758f", size = 14 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="6" r="4.2" fill={color} />
      <circle cx="17.5" cy="10" r="4.2" fill={color} />
      <circle cx="15.5" cy="16.5" r="4.2" fill={color} />
      <circle cx="8.5" cy="16.5" r="4.2" fill={color} />
      <circle cx="6.5" cy="10" r="4.2" fill={color} />
      <circle cx="12" cy="12" r="2.6" fill="#ffd75e" />
    </svg>
  );
}
