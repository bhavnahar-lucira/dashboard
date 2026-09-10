import {
  LayoutDashboard,
  MapPin,
  Store,
  Video,
  Camera,
  Coins,
  Bell,
  ShoppingCart,
  Heart,
  Receipt,
  Percent,
  RefreshCw,
  Image as ImageIcon,
  LayoutTemplate,
  Layers,
  Users,
  Ticket,
  Gift,
  Gem,
  ListOrdered,
  PackageSearch,
  House,
  LayoutGrid,
  PackageOpen,
  Globe,
  PiggyBank,
} from 'lucide-react';

/**
 * Single source of truth for the admin navigation.
 *
 * Both the sidebar and the overview page render from this tree, so a
 * module is grouped the same way everywhere. Groups (items with
 * `children`) mirror the storefront surface they control — Homepage,
 * collection page (PLP), product page (PDP) — plus the site-wide
 * settings that apply everywhere.
 *
 * `description` is only consumed by the overview cards; the sidebar
 * ignores it. `tone` picks the icon-chip colour on the overview and
 * defaults to the brand tint.
 */
export const NAV_SECTIONS = [
  {
    items: [{ title: 'Overview', icon: LayoutDashboard, href: '/dashboard' }],
  },
  {
    label: 'Commerce',
    items: [
      {
        title: 'Orders',
        icon: Receipt,
        href: '/dashboard/payments',
        description: 'View and track confirmed payments and orders placed through the website.',
      },
      {
        title: 'Abandoned Carts',
        icon: ShoppingCart,
        href: '/dashboard/carts',
        description: 'Real-time view of customer shopping carts across the store.',
      },
      {
        title: 'User Wishlists',
        icon: Heart,
        href: '/dashboard/wishlists',
        description: 'Monitor customer wishlists and saved items.',
      },
    ],
  },
  {
    label: 'Promotions',
    items: [
      {
        title: 'Product Discounts',
        icon: Percent,
        blurb: 'Discount codes and cart-value rewards.',
        children: [
          {
            title: 'Coupons',
            icon: Ticket,
            href: '/dashboard/product-discounts',
            description: 'Create product-level discount codes and control where they apply.',
          },
          {
            title: 'Free Gift Tiers',
            icon: Gift,
            href: '/dashboard/free-gift-tiers',
            description: 'Set cart-value thresholds that unlock free gifts at checkout.',
          },
        ],
      },
    ],
  },
  {
    label: 'Storefront',
    items: [
      {
        title: 'Homepage',
        icon: House,
        blurb: 'Everything a visitor sees on the landing page.',
        children: [
          {
            title: 'Topbar Offers',
            icon: Bell,
            href: '/dashboard/topbar-offers',
            description: 'Update announcements and promotional messages in the header strip.',
          },
          {
            title: 'Hero Banners',
            icon: ImageIcon,
            href: '/dashboard/hero-banners',
            description: 'Manage homepage hero slider images, videos, and links.',
          },
          {
            title: 'Curated Looks',
            icon: Camera,
            href: '/dashboard/curated-looks',
            description: 'Manage shop-the-look sets and matching product collections.',
          },
          {
            title: 'Styled Videos',
            icon: Video,
            href: '/dashboard/styled-videos',
            description: 'Update the shoppable video gallery and product tagging.',
          },
        ],
      },
      {
        title: 'Collection Page',
        short: 'PLP',
        icon: LayoutGrid,
        blurb: 'Product listing pages — ordering and in-grid banners.',
        children: [
          {
            title: 'Smart Collections',
            icon: ListOrdered,
            href: '/dashboard/smart-collection',
            description: 'Control how products are ordered on each collection page with rule-based sorting.',
          },
          {
            title: 'PLP Banners',
            icon: LayoutTemplate,
            href: '/dashboard/plp-banners',
            description: 'Manage the collection-page top banner, per-collection overrides, and in-grid promo banners.',
          },
        ],
      },
      {
        title: 'Product Page',
        short: 'PDP',
        icon: PackageOpen,
        blurb: 'Modules that render below the product details.',
        children: [
          {
            title: 'Video Collections',
            icon: Layers,
            href: '/dashboard/styled-videos-collection',
            description: 'Manage styled video galleries shown for specific collections on product pages.',
          },
          {
            title: 'From Same Collection',
            icon: Gem,
            href: '/dashboard/from-same-collection',
            description: 'Tune the "From the Same Collection" recommendations shown on product pages.',
          },
        ],
      },
      {
        title: 'Site-wide',
        icon: Globe,
        blurb: 'Settings that apply across every page.',
        children: [
          {
            title: 'Stores',
            icon: Store,
            href: '/dashboard/stores',
            description: 'Update physical store locations, contact details, and images.',
          },
          {
            title: 'Daily Rates',
            icon: Coins,
            href: '/dashboard/update-rate',
            description: 'Manage daily rates for the gold, silver, and platinum pages.',
            tone: 'warn',
          },
          {
            title: 'Scheme Offer',
            icon: PiggyBank,
            href: '/dashboard/scheme-offer',
            description: 'Manage promotional gifts, thresholds, and visibility for savings schemes.',
          },
        ],
      },
    ],
  },
  {
    label: 'Catalog & Tools',
    items: [
      {
        title: 'Product Information',
        icon: PackageSearch,
        href: '/dashboard/product-insights',
        description: 'Look up catalog details and insights for any product.',
      },
      {
        title: 'Pincodes',
        icon: MapPin,
        href: '/dashboard/pincodes',
        description: 'Manage serviceable pincodes, delivery times, and locations.',
      },
      {
        title: 'User Activity',
        icon: Users,
        href: '/dashboard/user-activity',
        description: 'Track successful logins, registrations, and active session completions.',
        tone: 'ok',
        isTracking: true,
      },
      {
        title: 'Clear Cache',
        icon: RefreshCw,
        href: '/dashboard/revalidate',
        description: 'Clear Vercel cache for any page to instantly apply updates.',
      },
    ],
  },
];

export const ROLE_HREFS = {
  marketing: [
    '/dashboard',
    '/dashboard/revalidate',
    '/dashboard/update-rate',
    '/dashboard/curated-looks',
    '/dashboard/styled-videos',
    '/dashboard/styled-videos-collection',
    '/dashboard/from-same-collection',
    '/dashboard/smart-collection',
    '/dashboard/product-insights',
  ],
  cro: [
    '/dashboard',
    '/dashboard/payments',
    '/dashboard/carts',
    '/dashboard/wishlists',
    '/dashboard/user-activity',
  ],
};

export const ROLE_LABELS = {
  admin: 'Administrator',
  marketing: 'Marketing',
  cro: 'Growth / CRO',
};

export function isHrefAllowed(role, href) {
  if (!role) return false;
  if (role === 'admin') return true;
  return (ROLE_HREFS[role] || []).includes(href);
}

/**
 * Role-filter the nav tree. A group survives only while it still has a
 * visible child; a section survives only while it still has an item.
 */
export function filterSectionsForRole(role) {
  return NAV_SECTIONS.map((section) => {
    const items = section.items
      .map((item) => {
        if (!item.children) return isHrefAllowed(role, item.href) ? item : null;
        const children = item.children.filter((child) => isHrefAllowed(role, child.href));
        return children.length ? { ...item, children } : null;
      })
      .filter(Boolean);
    return items.length ? { ...section, items } : null;
  }).filter(Boolean);
}
