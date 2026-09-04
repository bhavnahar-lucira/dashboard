import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function setCookie(name, value, days) {
  let expires = '';
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = '; expires=' + date.toUTCString();
  }
  document.cookie = name + '=' + (JSON.stringify(value) || '') + expires + '; path=/';
}

export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + '=';
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) {
      const val = c.substring(nameEQ.length, c.length);
      try { return JSON.parse(val); } catch (e) { return val; }
    }
  }
  return null;
}

// Shopify's staged-upload policy sets content-length-range to 1..20971520, so
// Google Cloud Storage rejects anything past 20 MiB with an XML error the caller
// never sees. Check up front and say so plainly.
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function uploadToShopify(file, customFilename = null) {
  try {
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      throw new Error(`This file is ${mb} MB. Shopify's limit is 20 MB — please compress it and try again.`);
    }

    const finalFilename = customFilename || file.name;
    const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

    // 1. Get staged target
    const stagedRes = await fetch(baseUrl + '/api/shopify/upload/staged', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: finalFilename, mimeType: file.type }),
    });
    
    const stagedData = await stagedRes.json();
    if (!stagedRes.ok) throw new Error(stagedData.error || 'Failed to get upload URL');
    
    const { stagedTarget } = stagedData;
    if (!stagedTarget) throw new Error('Invalid upload target received from server');

    // 2. Upload to Shopify's URL
    const formData = new FormData();
    stagedTarget.parameters.forEach((param) => {
      formData.append(param.name, param.value);
    });
    formData.append('file', file);

    const uploadRes = await fetch(stagedTarget.url, { method: 'POST', body: formData });
    if (!uploadRes.ok) {
      // The storage bucket explains itself in an XML <Message>; surfacing it turns
      // every upload failure from "something went wrong" into an actionable one.
      const detail = await uploadRes.text().catch(() => '');
      const message = (detail.match(/<Message>([^<]*)<\/Message>/) || [])[1];
      throw new Error(message || `Shopify storage rejected the file (HTTP ${uploadRes.status})`);
    }

    // 3. Register file in Shopify
    const registerRes = await fetch(baseUrl + '/api/shopify/upload/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceUrl: stagedTarget.resourceUrl, mimeType: file.type, filename: finalFilename }),
    });

    const result = await registerRes.json();
    if (!result.success) throw new Error(result.error || 'Failed to register file in Shopify');

    return result.url;
  } catch (error) {
    console.error('Upload to Shopify error:', error);
    throw error;
  }
}

export function getValidSrc(src, fallback = '/images/product/1.jpg') {
  if (typeof src === 'string' && src.trim() !== '') return src;
  if (src && typeof src === 'object' && src.url) return src.url;
  return fallback;
}

export function getEstimatedDispatchDate(isInStock, leadTime = 12) {
  const today = new Date();
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  if (isInStock) {
    const dispatchDate = new Date(today);
    dispatchDate.setDate(today.getDate() + 2);
    return 'Estimated free dispatch by ' + months[dispatchDate.getMonth()] + ' ' + dispatchDate.getDate() + ', ' + dispatchDate.getFullYear();
  } else {
    const totalDays = (parseInt(leadTime) || 12) + 3;
    const dispatchDate = new Date(today);
    dispatchDate.setDate(today.getDate() + totalDays);
    return 'Estimated free dispatch by ' + months[dispatchDate.getMonth()] + ' ' + dispatchDate.getDate() + ', ' + dispatchDate.getFullYear();
  }
}
