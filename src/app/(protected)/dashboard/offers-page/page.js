'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Loader2,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  RotateCcw,
  Monitor,
  Smartphone,
  Eye,
  CheckCircle2,
  AlertCircle,
  Truck,
  RefreshCw,
  Gem,
  Receipt,
  Link as LinkIcon,
} from 'lucide-react';
import PageHeader, { StatusPill } from '@/components/common/PageHeader';
import { uploadToShopify } from '@/lib/utils';
import { toast } from 'react-toastify';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

export default function OffersPageAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState(null); // identifier of field being uploaded
  const [activeTab, setActiveTab] = useState('editor'); // 'editor' | 'preview'
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  const [heroBanner, setHeroBanner] = useState({
    enabled: true,
    title: 'Something Special Awaits',
    subtitle: '',
    desktopImage: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/offer-banner.png?v=1792042018',
    mobileImage: 'https://cdn.shopify.com/s/files/1/0739/8516/3482/files/Offer-Mobile_ded4c971-bc21-412a-bf4a-7f0ac3c045a3.jpg?v=1792042015',
    link: '/collections/all',
    alt: 'Something Special Awaits - Lucira Offers',
  });

  const [offerCards, setOfferCards] = useState([]);
  const [trustBadges, setTrustBadges] = useState({
    enabled: true,
    items: [
      { id: 'tb_1', text: 'Free and secure shipping', icon: 'shipping' },
      { id: 'tb_2', text: 'Lifetime return or exchange', icon: 'exchange' },
      { id: 'tb_3', text: '100% diamond value guarantee', icon: 'diamond' },
      { id: 'tb_4', text: '15-day money back guarantee', icon: 'return' },
    ],
  });

  const [seo, setSeo] = useState({
    title: 'Exclusive Offers & Deals | Lucira Jewelry',
    description: 'Explore exclusive jewellery offers, diamond discounts, and making charge waivers at Lucira Jewelry.',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/settings/offers-page`);
      if (res.ok) {
        const data = await res.json();
        if (data.heroBanner) setHeroBanner(data.heroBanner);
        if (Array.isArray(data.offerCards)) setOfferCards(data.offerCards);
        if (data.trustBadges) setTrustBadges(data.trustBadges);
        if (data.seo) setSeo(data.seo);
      } else {
        toast.error('Failed to load Offers Page settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e, onComplete, targetId) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingTarget(targetId);
      toast.info('Uploading image to Shopify CDN...');
      const url = await uploadToShopify(file);
      onComplete(url);
      toast.success('Image uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploadingTarget(null);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        heroBanner,
        offerCards,
        trustBadges,
        seo,
      };

      const res = await fetch(`${BASE_URL}/api/settings/offers-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success('Offers Page saved successfully and storefront revalidated!');
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to save settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCard = () => {
    const cardNum = offerCards.length + 1;
    const newCard = {
      id: `offer_${Date.now()}`,
      title: `Offer #${cardNum}`,
      image: '',
      mobileImage: '',
      link: '/collections/',
      alt: `Offer #${cardNum}`,
      enabled: true,
    };
    setOfferCards([...offerCards, newCard]);
    toast.info(`Offer card #${cardNum} added.`);
  };

  const handleRemoveCard = (index) => {
    const cardTitle = offerCards[index]?.title || `Card #${index + 1}`;
    if (confirm(`Are you sure you want to delete "${cardTitle}"?`)) {
      setOfferCards(offerCards.filter((_, i) => i !== index));
    }
  };

  const handleMoveCard = (index, direction) => {
    if (direction === 'up' && index > 0) {
      const next = [...offerCards];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      setOfferCards(next);
    } else if (direction === 'down' && index < offerCards.length - 1) {
      const next = [...offerCards];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      setOfferCards(next);
    }
  };

  const handleUpdateCard = (index, field, value) => {
    const next = [...offerCards];
    next[index] = { ...next[index], [field]: value };
    setOfferCards(next);
  };


  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
        <p className="text-sm font-medium text-zinc-500">Loading Offers Page settings...</p>
      </div>
    );
  }

  return (
    <div className="container-main py-8 px-4 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Offers Page Management</h1>
            <StatusPill tone="ok">Live on Storefront</StatusPill>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Update the hero banner, promotional offer cards, and trust badges on the Offers landing page.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-zinc-100 p-1 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'editor'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                activeTab === 'preview'
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>
          </div>

          <a
            href="http://localhost:3000/pages/offers"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
          >
            <span>Live /pages/offers</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-[#5A413F] rounded-lg hover:bg-[#463230] disabled:opacity-50 transition-all shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>


      {activeTab === 'preview' ? (
        /* ================= LIVE PREVIEW TAB ================= */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-100 p-2 rounded-xl border border-zinc-200">
            <span className="text-xs font-semibold text-zinc-700 ml-2">Device Layout:</span>
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-zinc-200">
              <button
                type="button"
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md ${
                  previewDevice === 'desktop' ? 'bg-[#5A413F] text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Desktop
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md ${
                  previewDevice === 'mobile' ? 'bg-[#5A413F] text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                Mobile
              </button>
            </div>
          </div>

          <div
            className={`mx-auto bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-xl transition-all ${
              previewDevice === 'mobile' ? 'max-w-[420px]' : 'w-full'
            }`}
          >
            {/* Top Mock Header */}
            <div className="bg-[#111] text-amber-200 text-center py-2 px-4 text-xs font-medium tracking-wide">
              ✨ Free Gold Coin on orders over ₹15,000
            </div>
            <div className="py-3 px-6 border-b border-zinc-100 flex items-center justify-between">
              <div className="font-serif tracking-widest text-lg font-bold text-[#5A413F]">LUCIRA</div>
              <div className="text-[11px] text-zinc-400 font-medium tracking-wider">OFFERS PREVIEW</div>
            </div>

            {/* Hero Banner Preview */}
            {heroBanner.enabled !== false && (
              <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#C29A73] via-[#D8B490] to-[#C29A73]">
                <img
                  src={
                    previewDevice === 'mobile'
                      ? heroBanner.mobileImage || heroBanner.desktopImage
                      : heroBanner.desktopImage
                  }
                  alt={heroBanner.alt}
                  className="w-full h-auto object-cover max-h-[380px]"
                />
              </div>
            )}

            {/* Offer Cards Preview */}
            <div className="p-4 sm:p-6 md:p-8">
              <div
                className={
                  previewDevice === 'mobile'
                    ? 'grid grid-cols-2 gap-2.5'
                    : 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4'
                }
              >
                {offerCards
                  .filter((c) => c.enabled !== false)
                  .map((card, idx) => (
                    <div
                      key={card.id || idx}
                      className="w-full"
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-100 rounded-[4px] shadow-2xs hover:shadow-md transition-all">
                        <img
                          src={
                            previewDevice === 'mobile'
                              ? card.mobileImage || card.image
                              : card.image
                          }
                          alt={card.alt || card.title}
                          className="h-full w-full object-cover rounded-[4px] transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Trust Badges Preview (Identical to Homepage FeatureBar) */}
            <div className="border-t border-zinc-100 bg-[#FAFAFA] py-5 px-4">
              <div
                className={
                  previewDevice === 'mobile'
                    ? 'grid grid-cols-2 gap-4'
                    : 'grid grid-cols-4 gap-4 text-center'
                }
              >
                {[
                  { text: 'Free & Insured Shipping', icon: Truck },
                  { text: 'Certified Diamond & Gold Jewelry', icon: Gem },
                  { text: 'Lifetime Buyback or Exchange', icon: RefreshCw },
                  { text: '15-day Money Back Guarantee', icon: Receipt },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center sm:text-left">
                      <div className="text-[#5A413F] shrink-0">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] sm:text-xs font-semibold text-zinc-800 leading-tight">
                        {item.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= EDITOR TAB ================= */
        <div className="space-y-8">
          {/* SECTION 1: HERO BANNER */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">1. Hero Banner Creatives</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Top promotional hero banner displayed on the Offers Page.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={heroBanner.enabled !== false}
                  onChange={(e) => setHeroBanner({ ...heroBanner, enabled: e.target.checked })}
                  className="rounded border-zinc-300 text-[#5A413F] focus:ring-[#5A413F]"
                />
                <span className="text-xs font-semibold text-zinc-700">Display Hero Banner</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Desktop Banner Image */}
              <div className="space-y-3 bg-[#FAF9F8] p-4 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-zinc-500" />
                    Desktop Hero Image
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#5A413F] bg-white border border-[#EADFD8] rounded-lg hover:bg-zinc-50 cursor-pointer shadow-2xs">
                    {uploadingTarget === 'hero-desktop' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) => setHeroBanner((prev) => ({ ...prev, desktopImage: url })),
                          'hero-desktop'
                        )
                      }
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={heroBanner.desktopImage}
                  onChange={(e) => setHeroBanner({ ...heroBanner, desktopImage: e.target.value })}
                  placeholder="https://cdn.shopify.com/.../offer-banner.png"
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                />

                {heroBanner.desktopImage && (
                  <div className="relative aspect-[16/6] w-full rounded-lg overflow-hidden border border-zinc-300 bg-zinc-100">
                    <img
                      src={heroBanner.desktopImage}
                      alt="Desktop Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Mobile Banner Image */}
              <div className="space-y-3 bg-[#FAF9F8] p-4 rounded-xl border border-zinc-200">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-zinc-500" />
                    Mobile Hero Image
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#5A413F] bg-white border border-[#EADFD8] rounded-lg hover:bg-zinc-50 cursor-pointer shadow-2xs">
                    {uploadingTarget === 'hero-mobile' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>Upload</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        handleFileUpload(
                          e,
                          (url) => setHeroBanner((prev) => ({ ...prev, mobileImage: url })),
                          'hero-mobile'
                        )
                      }
                    />
                  </label>
                </div>

                <input
                  type="text"
                  value={heroBanner.mobileImage}
                  onChange={(e) => setHeroBanner({ ...heroBanner, mobileImage: e.target.value })}
                  placeholder="https://cdn.shopify.com/.../Offer-Mobile.jpg"
                  className="w-full text-xs font-mono px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                />

                {heroBanner.mobileImage && (
                  <div className="relative aspect-[16/7] w-full rounded-lg overflow-hidden border border-zinc-300 bg-zinc-100">
                    <img
                      src={heroBanner.mobileImage}
                      alt="Mobile Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Banner Click Destination URL
                </label>
                <div className="relative">
                  <LinkIcon className="w-3.5 h-3.5 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    value={heroBanner.link || ''}
                    onChange={(e) => setHeroBanner({ ...heroBanner, link: e.target.value })}
                    placeholder="/collections/all"
                    className="w-full pl-9 text-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Heading / Alt Text
                </label>
                <input
                  type="text"
                  value={heroBanner.alt || ''}
                  onChange={(e) =>
                    setHeroBanner({ ...heroBanner, alt: e.target.value, title: e.target.value })
                  }
                  placeholder="Something Special Awaits"
                  className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PROMOTIONAL OFFER CARDS */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">2. Promotional Offer Cards Grid</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Manage individual offer cards, images, destination links, and ordering.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddCard}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#5A413F] rounded-lg hover:bg-[#463230] shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Offer Card
              </button>
            </div>

            <div className="space-y-4">
              {offerCards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className="p-5 rounded-xl border border-zinc-200 bg-[#FAF9F8] hover:border-zinc-300 transition-all space-y-4"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-zinc-200 pb-3">
                    <div className="flex items-center gap-2.5 flex-1 max-w-lg min-w-0 mr-2">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#5A413F] text-white text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={card.title || ''}
                          onChange={(e) => handleUpdateCard(idx, 'title', e.target.value)}
                          placeholder="Card Title (Custom per offer)"
                          className="w-full text-xs font-bold text-zinc-900 bg-white border border-zinc-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 mr-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={card.enabled !== false}
                          onChange={(e) => handleUpdateCard(idx, 'enabled', e.target.checked)}
                          className="rounded border-zinc-300 text-[#5A413F] focus:ring-[#5A413F]"
                        />
                        <span className="text-xs font-medium text-zinc-600">Active</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, 'up')}
                        disabled={idx === 0}
                        title="Move Up"
                        className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 disabled:opacity-30"
                      >
                        <MoveUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveCard(idx, 'down')}
                        disabled={idx === offerCards.length - 1}
                        title="Move Down"
                        className="p-1 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200 disabled:opacity-30"
                      >
                        <MoveDown className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveCard(idx)}
                        title="Delete Card"
                        className="p-1 rounded text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                    {/* Left: Desktop Image */}
                    <div className="md:col-span-5 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">Desktop Card Creative</label>
                        <label className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-[#5A413F] bg-white border border-[#EADFD8] rounded hover:bg-zinc-50 cursor-pointer shadow-2xs">
                          {uploadingTarget === `card-${idx}-desktop` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(
                                e,
                                (url) => handleUpdateCard(idx, 'image', url),
                                `card-${idx}-desktop`
                              )
                            }
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={card.image}
                        onChange={(e) => handleUpdateCard(idx, 'image', e.target.value)}
                        placeholder="https://cdn.shopify.com/.../card.jpg"
                        className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                      />
                      {card.image && (
                        <div className="relative aspect-[4/5] max-h-[160px] rounded-[4px] overflow-hidden border border-zinc-300 bg-zinc-100">
                          <img src={card.image} alt={card.title} className="w-full h-full object-cover rounded-[4px]" />
                        </div>
                      )}
                    </div>

                    {/* Middle: Mobile Image */}
                    <div className="md:col-span-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-zinc-700">
                          Mobile Creative <span className="text-zinc-400 font-normal">(optional)</span>
                        </label>
                        <label className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold text-[#5A413F] bg-white border border-[#EADFD8] rounded hover:bg-zinc-50 cursor-pointer shadow-2xs">
                          {uploadingTarget === `card-${idx}-mobile` ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Upload className="w-3 h-3" />
                          )}
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileUpload(
                                e,
                                (url) => handleUpdateCard(idx, 'mobileImage', url),
                                `card-${idx}-mobile`
                              )
                            }
                          />
                        </label>
                      </div>
                      <input
                        type="text"
                        value={card.mobileImage || ''}
                        onChange={(e) => handleUpdateCard(idx, 'mobileImage', e.target.value)}
                        placeholder="Falls back to desktop if empty"
                        className="w-full text-xs font-mono px-3 py-1.5 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                      />
                      {(card.mobileImage || card.image) && (
                        <div className="relative aspect-[4/5] max-h-[160px] rounded-[4px] overflow-hidden border border-zinc-300 bg-zinc-100">
                          <img
                            src={card.mobileImage || card.image}
                            alt={card.title}
                            className="w-full h-full object-cover rounded-[4px]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Right: URL */}
                    <div className="md:col-span-3 space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-700 mb-1">
                          Destination Link
                        </label>
                        <input
                          type="text"
                          value={card.link || ''}
                          onChange={(e) => handleUpdateCard(idx, 'link', e.target.value)}
                          placeholder="/collections/earrings"
                          className="w-full text-xs px-3 py-1.5 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {offerCards.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-xl bg-zinc-50">
                  <ImageIcon className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-600">No offer cards yet.</p>
                  <button
                    type="button"
                    onClick={handleAddCard}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#5A413F] rounded-lg"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Your First Card
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: SEO SETTINGS */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 border-b border-zinc-100 pb-3">
              3. Search Engine Optimization (SEO)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Meta Title
                </label>
                <input
                  type="text"
                  value={seo.title || ''}
                  onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Meta Description
                </label>
                <input
                  type="text"
                  value={seo.description || ''}
                  onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 bg-white border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5A413F]"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Save Bar */}
      <div className="sticky bottom-6 z-40 bg-white/95 backdrop-blur-md border border-zinc-200 rounded-2xl p-4 shadow-xl flex items-center justify-between">
        <div className="text-xs text-zinc-500 hidden sm:block">
          Changes will immediately take effect on the storefront.
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button
            type="button"
            onClick={fetchData}
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-[#5A413F] rounded-lg hover:bg-[#463230] disabled:opacity-50 transition-all shadow-md"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
