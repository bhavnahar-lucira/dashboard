/* ================= GENERIC API FETCH ================= */

const DEFAULT_BACKEND_URL = "http://localhost:8080";
const DEFAULT_LOCALHOST_BACKEND_URL = "http://127.0.0.1:8080";

const configuredBackendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL && process.env.NEXT_PUBLIC_BACKEND_URL.trim() !== "")
  ? process.env.NEXT_PUBLIC_BACKEND_URL
  : DEFAULT_BACKEND_URL;

const isLocalhost = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const BACKEND_URL = isLocalhost ? DEFAULT_LOCALHOST_BACKEND_URL : configuredBackendUrl;

export const apiFetch = async (url, options = {}) => {
  // Determine if the URL should be prefixed with the backend base
  const isExternal = url.startsWith("/api/cart") || 
                    url.startsWith("/api/wishlist") || 
                    url.startsWith("/api/pincodes") ||
                    url.startsWith("/api/customer/orders") ||
                    url.startsWith("/api/rates") ||
                    url.startsWith("/api/stores");
  
  const finalUrl = isExternal ? `${BACKEND_URL}${url}` : url;

  const res = await fetch(finalUrl, {
    credentials: "include",
    cache: "no-store",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type");

  let data;

  if (contentType?.includes("application/json")) {
    data = await res.json();
  } else {
    throw new Error("Invalid server response");
  }

  if (!res.ok) {
    throw new Error(data?.error || "Something went wrong");
  }

  return data;
};
/* ================= SEND OTP ================= */

export const sendOtpApi = (mobile) =>
  apiFetch("/api/auth/send-otp", {
    method: "POST",
    body: JSON.stringify({ mobile }),
  });

/* ================= VERIFY OTP ================= */

export const verifyOtpApi = (mobile, otp) =>
  apiFetch("/api/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify({ mobile, otp }),
  });

/* ================= REGISTER ================= */

export const checkCustomerApi = (payload) =>
  apiFetch("/api/auth/check-customer", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const registerCustomer = (payload) =>
  apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchCustomerAddresses = () => apiFetch("/api/customer/addresses");

export const createCustomerAddress = ({ address, makeDefault = false }) =>
  apiFetch("/api/customer/addresses", {
    method: "POST",
    body: JSON.stringify({ address, makeDefault }),
  });

export const updateCustomerAddress = ({ addressId, address, makeDefault = false }) =>
  apiFetch("/api/customer/addresses", {
    method: "PATCH",
    body: JSON.stringify({ addressId, address, makeDefault, mode: "update" }),
  });

export const selectDefaultCustomerAddress = (addressId) =>
  apiFetch("/api/customer/addresses", {
    method: "PATCH",
    body: JSON.stringify({ addressId, mode: "default" }),
  });

export const deleteCustomerAddress = (addressId) =>
  apiFetch(`/api/customer/addresses?addressId=${encodeURIComponent(addressId)}`, {
    method: "DELETE",
  });

export const fetchWishlistApi = () => apiFetch("/api/wishlist");
export const addWishlistApi = (payload) =>
  apiFetch("/api/wishlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });
export const removeWishlistApi = (productId, variantId = "") => {
  const q = new URLSearchParams();
  q.set("productId", productId);
  if (variantId) q.set("variantId", variantId);
  return apiFetch(`/api/wishlist?${q.toString()}`, {
    method: "DELETE",
  });
};

export const fetchCheckoutAddressSelection = () =>
  apiFetch("/api/checkout/address-selection");

export const saveCheckoutAddressSelection = ({ billingAddressMode, billingAddressId = "" }) =>
  apiFetch("/api/checkout/address-selection", {
    method: "PATCH",
    body: JSON.stringify({ billingAddressMode, billingAddressId }),
  });

export const createRazorpayOrder = (payload) =>
  apiFetch("/api/payment/razorpay/order", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const completeRazorpayPayment = (payload) =>
  apiFetch("/api/payment/razorpay/complete", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/* ================= ATTACH CART ================= */

export const attachCartApi = ({ cartId }) =>
  apiFetch("/api/cart/attach", {
    method: "POST",
    body: JSON.stringify({ cartId }),
  });

/* ================= CREATE CART ================= */

export const createCartApi = () =>
  apiFetch("/api/cart/create", {
    method: "POST",
    // server will grab the access token from the httpOnly cookie
    body: JSON.stringify({}),
  });

/* ================= COLLECTION PRODUCTS ================= */

export const fetchCollectionProducts = async (params) => {
  const q = new URLSearchParams();

  q.set("handle", params.handle);
  q.set("limit", params.limit || 20);

  if (params.cursor) q.set("cursor", params.cursor);
  if (params.sort) q.set("sort", params.sort);
  if (params.filters !== undefined) {
    q.set("filters", params.filters);
  }

  const url = `/api/collection?${q.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Failed to fetch products");
  }

  return res.json();
};

/* ================= COLLECTION FILTERS ================= */

export const fetchCollectionFilters = async (handle) => {
  if (!handle) {
    return { filters: {} };
  }

  const res = await fetch(`/api/collection/filters?handle=${handle}`);

  if (!res.ok) {
    throw new Error("Failed to fetch filters");
  }

  return res.json();
};

/* ================= VARIANT PRICING ================= */

export const fetchVariantPricing = async (variantId, productId = "") => {
  if (!variantId) {
    throw new Error("Variant ID required");
  }
  const url = `/api/variant-pricing?variantId=${variantId}${productId ? `&productId=${productId}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch variant pricing");
  }
  return res.json();
};

/* ================= PRODUCT REVIEWS ================= */

export const fetchProductReviews = async (productId) => {
  if (!productId) {
    throw new Error("Product ID required");
  }

  const res = await fetch(`/api/reviews?productId=${productId}`);
  if (!res.ok) {
    throw new Error("Failed to fetch reviews");
  }
  return res.json();
};
