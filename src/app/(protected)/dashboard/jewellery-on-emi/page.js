'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  RotateCcw,
  Sparkles,
  Calculator,
  Layout,
  HelpCircle,
  Eye,
  Check,
  ExternalLink,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import { toast } from 'react-toastify';

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

const DEFAULT_SETTINGS = {
  productsIntro: {
    enabled: true,
    title: "Diamond jewelry from ₹50,000",
    subtitle: "EMI is available where eligible and applies to the diamond component of each piece.",
  },
  hero: {
    enabled: true,
    lead: "You can buy jewelry on EMI at Lucira where eligible, with 0-cost EMI and tenures of 3, 6, 9 and 12 months.",
    scope: {
      enabled: true,
      title: "EMI applies only to the eligible diamond component of a piece. We do not finance the gold component.",
      subtitle: "The gold component is paid as a down payment.",
    },
    description: "Get your jewelry without waiting for the final EMI. Once the required approval, KYC and order formalities are completed, eligible ready-to-ship (RTS) and made-to-order (MTO) orders can be handed over while the remaining EMIs continue as scheduled.",
    showDescription: true,
    buttons: [
      { id: "btn_1", label: "See how EMI works", href: "#how-it-works", variant: "primary", enabled: true },
      { id: "btn_2", label: "Visit an Experience Centre", href: "#experience-centres", variant: "secondary", enabled: true },
    ],
    trustText: "Certified lab-grown diamonds · Experience Centres in Mumbai, Pune, Noida and Delhi",
    showTrustText: true,
  },
  facts: [
    { id: "fact_1", title: "3, 6, 9, 12", subtitle: "month EMI tenures", enabled: true },
    { id: "fact_2", title: "0-cost EMI", subtitle: "on the eligible diamond component", enabled: true },
    { id: "fact_3", title: "₹0", subtitle: "processing fee", enabled: true },
    { id: "fact_4", title: "No extra cost", subtitle: "charged to you for EMI", enabled: true },
  ],
  calculator: {
    title: "Jewelry EMI Calculator",
    subtitle: "Real-time monthly installment estimate",
    interestBadge: "0% Interest",
    minValue: 50000,
    maxValue: 300000,
    stepValue: 5000,
    defaultValue: 75000,
    presetAmounts: [50000, 75000, 100000, 150000, 200000],
    downPaymentOptions: [
      { percent: 0, label: "0% (Diamond)" },
      { percent: 20, label: "20% Gold" },
      { percent: 30, label: "30% Gold" },
      { percent: 40, label: "40% Gold" },
    ],
    defaultDownPaymentPercent: 20,
    tenures: [3, 6, 9, 12],
    defaultTenure: 6,
    allowCustomTenure: true,
    minCustomTenure: 1,
    maxCustomTenure: 36,
    disclaimer: "*Illustration only. Subject to partner approval & KYC verification.",
    ctaText: "Explore Eligible Jewelry",
    ctaTarget: "products",
  },
};

export default function JewelleryOnEmiPage() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero'); // 'hero' | 'facts' | 'calculator' | 'preview'

  // New tenure input state for admin
  const [newTenureMonth, setNewTenureMonth] = useState('');
  // New preset amount input state
  const [newPresetAmount, setNewPresetAmount] = useState('');
  // New down payment state
  const [newDownPaymentPct, setNewDownPaymentPct] = useState('');
  const [newDownPaymentLabel, setNewDownPaymentLabel] = useState('');

  // Preview interactive calculator state
  const [previewAmount, setPreviewAmount] = useState(75000);
  const [previewDpPercent, setPreviewDpPercent] = useState(20);
  const [previewTenure, setPreviewTenure] = useState(6);
  const [previewIsCustom, setPreviewIsCustom] = useState(false);
  const [previewCustomInput, setPreviewCustomInput] = useState('6');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/settings/jewellery-on-emi`);
      if (res.ok) {
        const data = await res.json();
        setSettings({
          hero: {
            ...DEFAULT_SETTINGS.hero,
            ...(data.hero || {}),
            scope: { ...DEFAULT_SETTINGS.hero.scope, ...(data.hero?.scope || {}) },
            buttons: Array.isArray(data.hero?.buttons) ? data.hero.buttons : DEFAULT_SETTINGS.hero.buttons,
          },
          facts: Array.isArray(data.facts) ? data.facts : DEFAULT_SETTINGS.facts,
          productsIntro: { ...DEFAULT_SETTINGS.productsIntro, ...(data.productsIntro || {}) },
          calculator: {
            ...DEFAULT_SETTINGS.calculator,
            ...(data.calculator || {}),
            presetAmounts: Array.isArray(data.calculator?.presetAmounts)
              ? data.calculator.presetAmounts
              : DEFAULT_SETTINGS.calculator.presetAmounts,
            downPaymentOptions: Array.isArray(data.calculator?.downPaymentOptions)
              ? data.calculator.downPaymentOptions
              : DEFAULT_SETTINGS.calculator.downPaymentOptions,
            tenures: Array.isArray(data.calculator?.tenures)
              ? data.calculator.tenures
              : DEFAULT_SETTINGS.calculator.tenures,
          },
        });
        if (data.calculator?.defaultValue) {
          setPreviewAmount(data.calculator.defaultValue);
        }
        if (data.calculator?.defaultDownPaymentPercent !== undefined) {
          setPreviewDpPercent(data.calculator.defaultDownPaymentPercent);
        }
        if (data.calculator?.defaultTenure) {
          setPreviewTenure(data.calculator.defaultTenure);
          setPreviewCustomInput(String(data.calculator.defaultTenure));
        }
      } else {
        toast.error('Failed to load EMI settings');
      }
    } catch (err) {
      console.error(err);
      toast.error('Could not connect to backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/api/settings/jewellery-on-emi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        toast.success('Jewelry on EMI settings saved successfully!');
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || 'Failed to save settings');
      }
    } catch (err) {
      toast.error('Error saving settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefaults = () => {
    if (window.confirm('Reset all Jewelry on EMI settings to default values?')) {
      setSettings(DEFAULT_SETTINGS);
      setPreviewAmount(DEFAULT_SETTINGS.calculator.defaultValue);
      setPreviewDpPercent(DEFAULT_SETTINGS.calculator.defaultDownPaymentPercent);
      setPreviewTenure(DEFAULT_SETTINGS.calculator.defaultTenure);
      setPreviewCustomInput(String(DEFAULT_SETTINGS.calculator.defaultTenure));
      toast.info('Reset to default template (click Save to persist)');
    }
  };

  /* ---------------- Fact Cards helpers ---------------- */
  const handleAddFact = () => {
    const newFact = {
      id: `fact_${Date.now()}`,
      title: 'New Highlight',
      subtitle: 'Description of offer',
      enabled: true,
    };
    setSettings((prev) => ({
      ...prev,
      facts: [...prev.facts, newFact],
    }));
  };

  const handleUpdateFact = (index, field, value) => {
    setSettings((prev) => {
      const updated = [...prev.facts];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, facts: updated };
    });
  };

  const handleRemoveFact = (index) => {
    setSettings((prev) => ({
      ...prev,
      facts: prev.facts.filter((_, i) => i !== index),
    }));
    toast.info('Feature card removed');
  };

  const handleMoveFact = (index, dir) => {
    setSettings((prev) => {
      const updated = [...prev.facts];
      const target = dir === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= updated.length) return prev;
      [updated[index], updated[target]] = [updated[target], updated[index]];
      return { ...prev, facts: updated };
    });
  };

  /* ---------------- Tenure helpers ---------------- */
  const handleAddTenure = () => {
    const val = parseInt(newTenureMonth, 10);
    if (isNaN(val) || val <= 0) {
      toast.warn('Enter a valid month count (e.g., 18 or 24)');
      return;
    }
    if (settings.calculator.tenures.includes(val)) {
      toast.warn(`Tenure ${val} months already exists`);
      return;
    }
    const updated = [...settings.calculator.tenures, val].sort((a, b) => a - b);
    setSettings((prev) => ({
      ...prev,
      calculator: { ...prev.calculator, tenures: updated },
    }));
    setNewTenureMonth('');
    toast.success(`Added ${val} months tenure option`);
  };

  const handleRemoveTenure = (t) => {
    if (settings.calculator.tenures.length <= 1) {
      toast.warn('You need to keep at least one tenure option');
      return;
    }
    const updated = settings.calculator.tenures.filter((item) => item !== t);
    setSettings((prev) => ({
      ...prev,
      calculator: {
        ...prev.calculator,
        tenures: updated,
        defaultTenure: prev.calculator.defaultTenure === t ? updated[0] : prev.calculator.defaultTenure,
      },
    }));
    toast.info(`Removed ${t} months tenure`);
  };

  /* ---------------- Preset Amount helpers ---------------- */
  const handleAddPresetAmount = () => {
    const val = parseInt(newPresetAmount, 10);
    if (isNaN(val) || val <= 0) {
      toast.warn('Enter a valid amount (e.g. 50000)');
      return;
    }
    if (settings.calculator.presetAmounts.includes(val)) {
      toast.warn('Amount already exists in presets');
      return;
    }
    const updated = [...settings.calculator.presetAmounts, val].sort((a, b) => a - b);
    setSettings((prev) => ({
      ...prev,
      calculator: { ...prev.calculator, presetAmounts: updated },
    }));
    setNewPresetAmount('');
  };

  const handleRemovePresetAmount = (amt) => {
    if (settings.calculator.presetAmounts.length <= 1) {
      toast.warn('Keep at least one preset amount');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      calculator: {
        ...prev.calculator,
        presetAmounts: prev.calculator.presetAmounts.filter((a) => a !== amt),
      },
    }));
  };

  /* ---------------- Down Payment helpers ---------------- */
  const handleAddDownPayment = () => {
    const pct = parseInt(newDownPaymentPct, 10);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      toast.warn('Enter a valid percent (0 to 100)');
      return;
    }
    const label = newDownPaymentLabel.trim() || `${pct}%`;
    const updated = [
      ...settings.calculator.downPaymentOptions.filter((d) => d.percent !== pct),
      { percent: pct, label },
    ].sort((a, b) => a.percent - b.percent);

    setSettings((prev) => ({
      ...prev,
      calculator: { ...prev.calculator, downPaymentOptions: updated },
    }));
    setNewDownPaymentPct('');
    setNewDownPaymentLabel('');
  };

  const handleRemoveDownPayment = (pct) => {
    if (settings.calculator.downPaymentOptions.length <= 1) {
      toast.warn('Keep at least one down payment option');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      calculator: {
        ...prev.calculator,
        downPaymentOptions: prev.calculator.downPaymentOptions.filter((d) => d.percent !== pct),
      },
    }));
  };

  /* ---------------- Hero Button helpers ---------------- */
  const handleAddHeroButton = () => {
    const newBtn = {
      id: `btn_${Date.now()}`,
      label: 'New Button',
      href: '#',
      variant: 'secondary',
      enabled: true,
    };
    setSettings((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        buttons: [...prev.hero.buttons, newBtn],
      },
    }));
  };

  const handleRemoveHeroButton = (id) => {
    setSettings((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        buttons: prev.hero.buttons.filter((b) => b.id !== id),
      },
    }));
  };

  const handleUpdateHeroButton = (id, field, value) => {
    setSettings((prev) => ({
      ...prev,
      hero: {
        ...prev.hero,
        buttons: prev.hero.buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
      },
    }));
  };

  const formatINR = (val) => {
    return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(val);
  };

  // Preview computations
  const previewDownPaymentAmt = Math.round((previewAmount * previewDpPercent) / 100);
  const previewFinancedDiamond = Math.max(0, previewAmount - previewDownPaymentAmt);
  const previewMonthly = previewTenure > 0 ? Math.round(previewFinancedDiamond / previewTenure) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[450px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#5A413F]" size={36} />
          <p className="text-sm font-medium text-ink-muted">Loading EMI settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Page Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="admin-title flex items-center gap-2.5">
            <Calculator className="text-[#5A413F]" size={26} />
            Jewelry on EMI Configuration
          </h1>
          <p className="admin-subtitle">
            Manage the hero content, highlight cards, calculator parameters, and customizable tenures for <span className="font-semibold text-zinc-700">/collections/jewellery-on-emi</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-hairline bg-panel text-xs font-semibold text-ink-soft hover:bg-zinc-100 transition-colors"
            title="Reset to default template"
          >
            <RotateCcw size={15} />
            Reset Defaults
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#5A413F] hover:bg-[#4A312F] text-white px-5 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 shadow-sm"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-hairline pb-3 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('hero')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'hero'
              ? 'bg-[#5A413F] text-white shadow-xs'
              : 'text-ink-soft hover:text-ink hover:bg-zinc-100'
          }`}
        >
          <Layout size={15} />
          1. Hero Content & Copy
        </button>

        <button
          onClick={() => setActiveTab('facts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'facts'
              ? 'bg-[#5A413F] text-white shadow-xs'
              : 'text-ink-soft hover:text-ink hover:bg-zinc-100'
          }`}
        >
          <Layers size={15} />
          2. Feature Cards ({settings.facts.filter((f) => f.enabled !== false).length} Active)
        </button>

        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'calculator'
              ? 'bg-[#5A413F] text-white shadow-xs'
              : 'text-ink-soft hover:text-ink hover:bg-zinc-100'
          }`}
        >
          <Calculator size={15} />
          3. Tenure & Calculator Settings
        </button>

        <button
          onClick={() => setActiveTab('preview')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ml-auto ${
            activeTab === 'preview'
              ? 'bg-[#5A413F] text-white shadow-xs'
              : 'text-ink-soft hover:text-ink hover:bg-zinc-100 border border-hairline'
          }`}
        >
          <Eye size={15} />
          Live Interactive Preview
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: HERO CONTENT & COPY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'hero' && (
        <div className="space-y-6">
          {/* Master Enable */}
          <div className="admin-panel p-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Enable Hero Section</h2>
              <p className="text-xs text-ink-muted mt-1">
                Display the dynamic hero introduction on the Jewelry on EMI collection page.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.hero.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, enabled: e.target.checked },
                  }))
                }
              />
              <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A413F]"></div>
            </label>
          </div>

          {/* Lead Heading */}
          <div className="admin-panel p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Lead Headline
              </label>
              <textarea
                rows={2}
                value={settings.hero.lead}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hero: { ...prev.hero, lead: e.target.value },
                  }))
                }
                className="w-full rounded-xl border border-hairline bg-panel p-3 text-sm text-ink font-medium focus:border-[#5A413F] focus:outline-none transition-colors"
                placeholder="e.g. You can buy jewelry on EMI at Lucira where eligible..."
              />
              <p className="text-[11px] text-zinc-400 mt-1">
                The large prominent serif heading displayed at the top of the collection page.
              </p>
            </div>
          </div>

          {/* Scope Callout Card */}
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h3 className="text-sm font-semibold text-ink">Scope Callout Box</h3>
                <p className="text-xs text-ink-muted">Highlight the diamond component financing policy</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.hero.scope?.enabled}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hero: {
                        ...prev.hero,
                        scope: { ...prev.hero.scope, enabled: e.target.checked },
                      },
                    }))
                  }
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A413F]"></div>
              </label>
            </div>

            {settings.hero.scope?.enabled && (
              <div className="grid grid-cols-1 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Callout Bold Title
                  </label>
                  <input
                    type="text"
                    value={settings.hero.scope?.title || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          scope: { ...prev.hero.scope, title: e.target.value },
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-hairline bg-panel px-3.5 py-2 text-sm text-ink font-semibold focus:border-[#5A413F] focus:outline-none"
                    placeholder="EMI applies only to the eligible diamond component..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1">
                    Callout Subtitle / Notes
                  </label>
                  <input
                    type="text"
                    value={settings.hero.scope?.subtitle || ''}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        hero: {
                          ...prev.hero,
                          scope: { ...prev.hero.scope, subtitle: e.target.value },
                        },
                      }))
                    }
                    className="w-full rounded-xl border border-hairline bg-panel px-3.5 py-2 text-sm text-ink focus:border-[#5A413F] focus:outline-none"
                    placeholder="The gold component is paid as a down payment."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Explanatory Description */}
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h3 className="text-sm font-semibold text-ink">Description Paragraph</h3>
                <p className="text-xs text-ink-muted">Delivery terms, approval details & KYC info</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.hero.showDescription}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, showDescription: e.target.checked },
                    }))
                  }
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A413F]"></div>
              </label>
            </div>

            {settings.hero.showDescription && (
              <div>
                <textarea
                  rows={3}
                  value={settings.hero.description}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, description: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel p-3 text-sm text-ink focus:border-[#5A413F] focus:outline-none"
                  placeholder="Get your jewelry without waiting for the final EMI..."
                />
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-hairline">
              <div>
                <h3 className="text-sm font-semibold text-ink">Hero Action Buttons</h3>
                <p className="text-xs text-ink-muted">Customize or remove call-to-action buttons</p>
              </div>
              <button
                type="button"
                onClick={handleAddHeroButton}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hairline text-xs font-semibold text-[#5A413F] hover:bg-zinc-50"
              >
                <Plus size={14} /> Add Button
              </button>
            </div>

            <div className="space-y-3">
              {settings.hero.buttons?.map((btn, index) => (
                <div
                  key={btn.id || index}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-hairline bg-zinc-50/50"
                >
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-0.5">Label</label>
                    <input
                      type="text"
                      value={btn.label}
                      onChange={(e) => handleUpdateHeroButton(btn.id, 'label', e.target.value)}
                      className="w-full rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink font-semibold"
                    />
                  </div>

                  <div className="flex-1 min-w-[160px]">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-0.5">Target Link</label>
                    <input
                      type="text"
                      value={btn.href}
                      onChange={(e) => handleUpdateHeroButton(btn.id, 'href', e.target.value)}
                      className="w-full rounded-lg border border-hairline bg-white px-2.5 py-1.5 text-xs text-ink"
                    />
                  </div>

                  <div className="w-[110px]">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-0.5">Style</label>
                    <select
                      value={btn.variant || 'primary'}
                      onChange={(e) => handleUpdateHeroButton(btn.id, 'variant', e.target.value)}
                      className="w-full rounded-lg border border-hairline bg-white px-2 py-1.5 text-xs text-ink font-medium"
                    >
                      <option value="primary">Solid Brown</option>
                      <option value="secondary">Outlined</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <label className="relative inline-flex items-center cursor-pointer" title="Enable/Disable button">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={btn.enabled !== false}
                        onChange={(e) => handleUpdateHeroButton(btn.id, 'enabled', e.target.checked)}
                      />
                      <div className="w-8 h-4 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-[#5A413F]"></div>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleRemoveHeroButton(btn.id)}
                      className="text-zinc-400 hover:text-red-500 p-1.5 transition-colors"
                      title="Remove this button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Text */}
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h3 className="text-sm font-semibold text-ink">Trust & Store Cities Text</h3>
                <p className="text-xs text-ink-muted">Small tagline under buttons</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.hero.showTrustText}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, showTrustText: e.target.checked },
                    }))
                  }
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A413F]"></div>
              </label>
            </div>

            {settings.hero.showTrustText && (
              <div>
                <input
                  type="text"
                  value={settings.hero.trustText}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hero: { ...prev.hero, trustText: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3.5 py-2 text-sm text-ink focus:border-[#5A413F] focus:outline-none"
                  placeholder="Certified lab-grown diamonds · Experience Centres..."
                />
              </div>
            )}
          </div>

          {/* Products Section Heading */}
          <div className="admin-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <div>
                <h3 className="text-sm font-semibold text-ink">Products Section Heading</h3>
                <p className="text-xs text-ink-muted">Heading and line shown just above the product grid</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.productsIntro.enabled !== false}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      productsIntro: { ...prev.productsIntro, enabled: e.target.checked },
                    }))
                  }
                />
                <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A413F]"></div>
              </label>
            </div>

            {settings.productsIntro.enabled !== false && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={settings.productsIntro.title}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      productsIntro: { ...prev.productsIntro, title: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3.5 py-2 text-sm text-ink focus:border-[#5A413F] focus:outline-none"
                  placeholder="Diamond jewelry from ₹50,000"
                />
                <textarea
                  rows={2}
                  value={settings.productsIntro.subtitle}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      productsIntro: { ...prev.productsIntro, subtitle: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3.5 py-2 text-sm text-ink focus:border-[#5A413F] focus:outline-none"
                  placeholder="EMI is available where eligible..."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FEATURE / HIGHLIGHT CARDS                                          */}
      {/* ========================================================================= */}
      {activeTab === 'facts' && (
        <div className="space-y-6">
          <div className="admin-panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-hairline">
              <div>
                <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                  <Layers size={18} className="text-[#5A413F]" />
                  Feature & Highlight Cards
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Cards displayed beneath the hero. If you do not want a particular card, you can disable or completely remove it.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddFact}
                className="flex items-center gap-2 bg-[#5A413F] hover:bg-[#4A312F] text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus size={15} /> Add Feature Card
              </button>
            </div>

            {/* List of cards */}
            <div className="space-y-3">
              {settings.facts.map((fact, index) => (
                <div
                  key={fact.id || index}
                  className={`flex flex-wrap items-center gap-3 p-4 rounded-xl border transition-all ${
                    fact.enabled !== false
                      ? 'border-hairline bg-white shadow-xs'
                      : 'border-zinc-200 bg-zinc-50 opacity-60'
                  }`}
                >
                  {/* Reorder Arrows */}
                  <div className="flex flex-col gap-1 pr-1">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveFact(index, 'up')}
                      className="text-zinc-400 hover:text-ink disabled:opacity-30 p-0.5"
                      title="Move up"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === settings.facts.length - 1}
                      onClick={() => handleMoveFact(index, 'down')}
                      className="text-zinc-400 hover:text-ink disabled:opacity-30 p-0.5"
                      title="Move down"
                    >
                      <MoveDown size={14} />
                    </button>
                  </div>

                  {/* Card Index Badge */}
                  <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                    {index + 1}
                  </div>

                  {/* Bold Headline Input */}
                  <div className="flex-1 min-w-[180px]">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                      Headline (Bold)
                    </label>
                    <input
                      type="text"
                      value={fact.title}
                      onChange={(e) => handleUpdateFact(index, 'title', e.target.value)}
                      className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-sm font-bold text-[#5A413F]"
                      placeholder="e.g. 0-cost EMI, ₹0, 3, 6, 9, 12"
                    />
                  </div>

                  {/* Subtitle Input */}
                  <div className="flex-1 min-w-[220px]">
                    <label className="text-[10px] font-semibold uppercase text-zinc-400 block mb-1">
                      Subtitle / Explanation
                    </label>
                    <input
                      type="text"
                      value={fact.subtitle}
                      onChange={(e) => handleUpdateFact(index, 'subtitle', e.target.value)}
                      className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-medium text-zinc-700"
                      placeholder="e.g. processing fee, on the eligible diamond component"
                    />
                  </div>

                  {/* Enabled Toggle */}
                  <div className="flex items-center gap-2 pt-4 sm:pt-0">
                    <label className="relative inline-flex items-center cursor-pointer" title="Enable/Disable card">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={fact.enabled !== false}
                        onChange={(e) => handleUpdateFact(index, 'enabled', e.target.checked)}
                      />
                      <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#5A413F]"></div>
                    </label>

                    {/* Delete button (Removes particular card) */}
                    <button
                      type="button"
                      onClick={() => handleRemoveFact(index)}
                      className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Remove this particular card"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {settings.facts.length === 0 && (
                <div className="text-center py-8 border border-dashed border-zinc-200 rounded-xl">
                  <p className="text-sm text-zinc-400">No feature cards added. Click &quot;Add Feature Card&quot; to add one.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TENURE & CALCULATOR SETTINGS                                       */}
      {/* ========================================================================= */}
      {activeTab === 'calculator' && (
        <div className="space-y-6">
          {/* 1. TENURE CONFIGURATION */}
          <div className="admin-panel p-6 space-y-5">
            <div className="pb-3 border-b border-hairline">
              <h2 className="text-base font-semibold text-ink flex items-center gap-2">
                <Calculator size={18} className="text-[#5A413F]" />
                Tenure Options Customization
              </h2>
              <p className="text-xs text-ink-muted mt-0.5">
                Configure the tenure chips offered on the storefront calculator, and decide whether users can enter a custom tenure.
              </p>
            </div>

            {/* Current Tenure Chips */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Preset Tenure Options (Months)
              </label>
              <div className="flex flex-wrap items-center gap-2.5">
                {settings.calculator.tenures.map((t) => (
                  <div
                    key={t}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                      settings.calculator.defaultTenure === t
                        ? 'bg-[#5A413F] text-white border-[#5A413F] shadow-xs'
                        : 'bg-white text-zinc-700 border-hairline'
                    }`}
                  >
                    <span>{t} Months</span>
                    {settings.calculator.defaultTenure === t && (
                      <span className="text-[10px] uppercase font-normal bg-white/20 px-1.5 py-0.2 rounded">Default</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveTenure(t)}
                      className={`hover:opacity-100 transition-opacity ${
                        settings.calculator.defaultTenure === t ? 'text-white/80 hover:text-white' : 'text-zinc-400 hover:text-red-500'
                      }`}
                      title={`Remove ${t} months option`}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Tenure */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={newTenureMonth}
                  onChange={(e) => setNewTenureMonth(e.target.value)}
                  placeholder="e.g. 18"
                  className="w-24 rounded-xl border border-hairline bg-panel px-3 py-1.5 text-xs font-semibold focus:border-[#5A413F] focus:outline-none"
                />
                <span className="text-xs text-zinc-500 font-medium">Months</span>
              </div>
              <button
                type="button"
                onClick={handleAddTenure}
                className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors"
              >
                <Plus size={14} /> Add Tenure Option
              </button>
            </div>

            {/* Default Selected Tenure */}
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-1.5">
                Default Selected Tenure
              </label>
              <select
                value={settings.calculator.defaultTenure}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    calculator: {
                      ...prev.calculator,
                      defaultTenure: Number(e.target.value),
                    },
                  }))
                }
                className="rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold text-ink"
              >
                {settings.calculator.tenures.map((t) => (
                  <option key={t} value={t}>
                    {t} Months
                  </option>
                ))}
              </select>
            </div>

            {/* CUSTOM TENURE TOGGLE */}
            <div className="mt-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                    <Sparkles size={16} className="text-amber-600" />
                    Allow User / Customer Custom Tenure
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Adds a &quot;+ Custom&quot; option on the storefront calculator so customers can type in any tenure.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.calculator.allowCustomTenure}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        calculator: {
                          ...prev.calculator,
                          allowCustomTenure: e.target.checked,
                        },
                      }))
                    }
                  />
                  <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#5A413F]"></div>
                </label>
              </div>

              {settings.calculator.allowCustomTenure && (
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">
                      Min Custom Months
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.calculator.minCustomTenure || 1}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          calculator: {
                            ...prev.calculator,
                            minCustomTenure: Number(e.target.value) || 1,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs text-ink font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-zinc-600 block mb-1">
                      Max Custom Months
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={settings.calculator.maxCustomTenure || 36}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          calculator: {
                            ...prev.calculator,
                            maxCustomTenure: Number(e.target.value) || 36,
                          },
                        }))
                      }
                      className="w-full rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs text-ink font-semibold"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 2. VALUE SLIDER & PRESET AMOUNTS */}
          <div className="admin-panel p-6 space-y-5">
            <div className="pb-3 border-b border-hairline">
              <h2 className="text-base font-semibold text-ink">Jewelry Value Range & Presets</h2>
              <p className="text-xs text-ink-muted">Slider limits and quick-select buttons</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Min Value (₹)
                </label>
                <input
                  type="number"
                  value={settings.calculator.minValue}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, minValue: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Max Value (₹)
                </label>
                <input
                  type="number"
                  value={settings.calculator.maxValue}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, maxValue: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Step (₹)
                </label>
                <input
                  type="number"
                  value={settings.calculator.stepValue}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, stepValue: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Default Value (₹)
                </label>
                <input
                  type="number"
                  value={settings.calculator.defaultValue}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, defaultValue: Number(e.target.value) },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>
            </div>

            {/* Preset Amount Chips */}
            <div className="pt-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-ink-muted mb-2">
                Quick-Select Value Chips
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {settings.calculator.presetAmounts.map((amt) => (
                  <div
                    key={amt}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-hairline bg-white text-xs font-bold text-zinc-700"
                  >
                    <span>₹{formatINR(amt)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemovePresetAmount(amt)}
                      className="text-zinc-400 hover:text-red-500"
                      title="Remove amount"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3">
                <input
                  type="number"
                  value={newPresetAmount}
                  onChange={(e) => setNewPresetAmount(e.target.value)}
                  placeholder="e.g. 250000"
                  className="w-32 rounded-xl border border-hairline bg-panel px-3 py-1.5 text-xs font-semibold"
                />
                <button
                  type="button"
                  onClick={handleAddPresetAmount}
                  className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold"
                >
                  <Plus size={14} /> Add Amount Chip
                </button>
              </div>
            </div>
          </div>

          {/* 3. GOLD DOWN PAYMENT OPTIONS */}
          <div className="admin-panel p-6 space-y-5">
            <div className="pb-3 border-b border-hairline">
              <h2 className="text-base font-semibold text-ink">Gold Down Payment Options</h2>
              <p className="text-xs text-ink-muted">Options for the down payment percentage</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {settings.calculator.downPaymentOptions.map((dp) => (
                <div
                  key={dp.percent}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold ${
                    settings.calculator.defaultDownPaymentPercent === dp.percent
                      ? 'bg-[#5A413F] text-white border-[#5A413F]'
                      : 'bg-white text-zinc-700 border-hairline'
                  }`}
                >
                  <span>{dp.label} ({dp.percent}%)</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDownPayment(dp.percent)}
                    className="hover:opacity-80"
                    title="Remove down payment option"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <input
                type="number"
                min="0"
                max="100"
                value={newDownPaymentPct}
                onChange={(e) => setNewDownPaymentPct(e.target.value)}
                placeholder="Percent %"
                className="w-24 rounded-xl border border-hairline bg-panel px-3 py-1.5 text-xs font-semibold"
              />
              <input
                type="text"
                value={newDownPaymentLabel}
                onChange={(e) => setNewDownPaymentLabel(e.target.value)}
                placeholder="Label (e.g. 50% Gold)"
                className="w-36 rounded-xl border border-hairline bg-panel px-3 py-1.5 text-xs font-semibold"
              />
              <button
                type="button"
                onClick={handleAddDownPayment}
                className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 px-3 py-1.5 rounded-xl text-xs font-semibold"
              >
                <Plus size={14} /> Add Option
              </button>
            </div>
          </div>

          {/* 4. LABELS & CTA */}
          <div className="admin-panel p-6 space-y-4">
            <div className="pb-3 border-b border-hairline">
              <h2 className="text-base font-semibold text-ink">Calculator Copy & CTA</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Card Title
                </label>
                <input
                  type="text"
                  value={settings.calculator.title}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, title: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Interest Badge Text
                </label>
                <input
                  type="text"
                  value={settings.calculator.interestBadge}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, interestBadge: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  CTA Button Text
                </label>
                <input
                  type="text"
                  value={settings.calculator.ctaText}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, ctaText: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted block mb-1">
                  Disclaimer Note
                </label>
                <input
                  type="text"
                  value={settings.calculator.disclaimer}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      calculator: { ...prev.calculator, disclaimer: e.target.value },
                    }))
                  }
                  className="w-full rounded-xl border border-hairline bg-panel px-3 py-2 text-xs text-ink"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE INTERACTIVE PREVIEW                                           */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
            <span>
              💡 This is a live simulation of what customers see on <strong>/collections/jewellery-on-emi</strong>. Test your sliders, custom tenure input, and feature cards here!
            </span>
            <button
              onClick={() => setActiveTab('hero')}
              className="text-xs font-bold underline text-blue-900 ml-4 whitespace-nowrap"
            >
              Back to Editor
            </button>
          </div>

          <div className="border border-[#EBE1D7] rounded-2xl bg-white p-6 lg:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column Preview (Hero) */}
              <div className="lg:col-span-7 space-y-5">
                {settings.hero.enabled && (
                  <>
                    <h2 className="font-abhaya text-2xl lg:text-3xl font-bold text-[#2B2523] leading-tight">
                      {settings.hero.lead}
                    </h2>

                    {settings.hero.scope?.enabled && (
                      <div className="p-4 bg-[#FAF6F4] border border-[#EBE1D7] border-l-4 border-l-[#5A413F] rounded-lg text-xs leading-relaxed text-zinc-700">
                        <p className="font-bold mb-1">{settings.hero.scope.title}</p>
                        <p>{settings.hero.scope.subtitle}</p>
                      </div>
                    )}

                    {settings.hero.showDescription && settings.hero.description && (
                      <p className="text-xs lg:text-sm text-zinc-600 leading-relaxed">
                        {settings.hero.description}
                      </p>
                    )}

                    {settings.hero.buttons?.filter((b) => b.enabled !== false).length > 0 && (
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        {settings.hero.buttons
                          .filter((b) => b.enabled !== false)
                          .map((btn) => (
                            <span
                              key={btn.id}
                              className={`px-5 py-2.5 rounded-sm text-xs font-semibold uppercase tracking-wider ${
                                btn.variant === 'secondary'
                                  ? 'border border-[#EBE1D7] bg-white text-[#5A413F]'
                                  : 'bg-[#5A413F] text-white'
                              }`}
                            >
                              {btn.label}
                            </span>
                          ))}
                      </div>
                    )}

                    {settings.hero.showTrustText && settings.hero.trustText && (
                      <p className="text-xs text-zinc-500 pt-1">{settings.hero.trustText}</p>
                    )}

                    {/* Feature Cards Preview */}
                    {settings.facts?.filter((f) => f.enabled !== false).length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
                        {settings.facts
                          .filter((f) => f.enabled !== false)
                          .map((fact) => (
                            <div
                              key={fact.id}
                              className="p-3 bg-white border border-[#EBE1D7] rounded-lg text-center shadow-xs"
                            >
                              <b className="font-abhaya text-lg text-[#5A413F] block leading-tight">
                                {fact.title}
                              </b>
                              <span className="text-[11px] text-zinc-500 block mt-1 leading-snug">
                                {fact.subtitle}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column Preview (Calculator) */}
              <div className="lg:col-span-5">
                <div className="bg-[#FAF6F4] border border-[#EBE1D7] rounded-xl p-6 shadow-sm space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#EBE1D7]">
                    <div>
                      <h3 className="font-semibold text-base text-[#2B2523] leading-tight">
                        {settings.calculator.title}
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{settings.calculator.subtitle}</p>
                    </div>
                    <span className="rounded bg-[#EAF7EE] text-[#00A63E] border border-[#B8DAB6] text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider">
                      {settings.calculator.interestBadge}
                    </span>
                  </div>

                  {/* 1. Value Slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-700">Jewelry Value</span>
                      <span className="font-bold text-sm text-[#5A413F]">₹{formatINR(previewAmount)}</span>
                    </div>

                    <input
                      type="range"
                      min={settings.calculator.minValue}
                      max={settings.calculator.maxValue}
                      step={settings.calculator.stepValue}
                      value={previewAmount}
                      onChange={(e) => setPreviewAmount(Number(e.target.value))}
                      className="w-full accent-[#5A413F]"
                    />

                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {settings.calculator.presetAmounts.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setPreviewAmount(amt)}
                          className={`text-[11px] px-2.5 py-1 rounded border transition-all ${
                            previewAmount === amt
                              ? 'bg-[#5A413F] text-white border-[#5A413F] font-semibold'
                              : 'bg-white text-zinc-700 border-[#EBE1D7]'
                          }`}
                        >
                          ₹{formatINR(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Down payment */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-700">Gold Down Payment</span>
                      <span className="font-semibold text-[#5A413F]">
                        ₹{formatINR(previewDownPaymentAmt)} ({previewDpPercent}%)
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5">
                      {settings.calculator.downPaymentOptions.map((dp) => (
                        <button
                          key={dp.percent}
                          type="button"
                          onClick={() => setPreviewDpPercent(dp.percent)}
                          className={`py-1.5 text-[11px] rounded border text-center transition-all ${
                            previewDpPercent === dp.percent
                              ? 'bg-[#5A413F] text-white border-[#5A413F] font-semibold'
                              : 'bg-white text-zinc-700 border-[#EBE1D7]'
                          }`}
                        >
                          {dp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Tenure Selection */}
                  <div className="space-y-2 pt-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-zinc-700">Tenure</span>
                      <span className="font-bold text-[#5A413F]">{previewTenure} Months</span>
                    </div>

                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                      {settings.calculator.tenures.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setPreviewTenure(t);
                            setPreviewIsCustom(false);
                          }}
                          className={`py-1.5 text-xs rounded border text-center transition-all ${
                            !previewIsCustom && previewTenure === t
                              ? 'bg-[#5A413F] text-white border-[#5A413F] font-bold'
                              : 'bg-white text-zinc-700 border-[#EBE1D7]'
                          }`}
                        >
                          {t} Mo
                        </button>
                      ))}

                      {settings.calculator.allowCustomTenure && (
                        <button
                          type="button"
                          onClick={() => setPreviewIsCustom(true)}
                          className={`py-1.5 text-xs rounded border text-center transition-all ${
                            previewIsCustom
                              ? 'bg-[#5A413F] text-white border-[#5A413F] font-bold'
                              : 'bg-white text-[#5A413F] border-[#5A413F]/50 font-medium'
                          }`}
                        >
                          Custom
                        </button>
                      )}
                    </div>

                    {/* Custom input expander */}
                    {previewIsCustom && (
                      <div className="flex items-center gap-2 p-2 bg-white rounded border border-[#EBE1D7] text-xs">
                        <span className="text-zinc-600 whitespace-nowrap">Enter months:</span>
                        <input
                          type="number"
                          min={settings.calculator.minCustomTenure || 1}
                          max={settings.calculator.maxCustomTenure || 36}
                          value={previewCustomInput}
                          onChange={(e) => {
                            setPreviewCustomInput(e.target.value);
                            const n = parseInt(e.target.value, 10);
                            if (!isNaN(n) && n > 0) setPreviewTenure(n);
                          }}
                          className="w-16 px-2 py-1 text-center font-bold text-[#5A413F] border border-zinc-200 rounded"
                        />
                        <span className="text-zinc-400 text-[10px]">
                          ({settings.calculator.minCustomTenure || 1}–{settings.calculator.maxCustomTenure || 36} mos)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 4. Results Card */}
                  <div className="bg-white border border-[#EBE1D7] rounded-lg p-3.5 space-y-2 text-xs">
                    <div className="flex justify-between items-baseline">
                      <span className="text-zinc-600">Monthly Installment</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-bold text-[#5A413F]">
                          ₹{formatINR(previewMonthly)}
                        </span>
                        <span className="text-zinc-400 text-[10px]">/ mo</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#EBE1D7] space-y-1 text-[11px] text-zinc-500">
                      <div className="flex justify-between">
                        <span>Financed Diamond Amount:</span>
                        <span className="font-semibold text-zinc-800">₹{formatINR(previewFinancedDiamond)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gold Down Payment:</span>
                        <span className="font-semibold text-zinc-800">₹{formatINR(previewDownPaymentAmt)}</span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-100 flex justify-between text-[10px] text-[#00A63E] font-medium">
                      <span>Processing Fee: ₹0</span>
                      <span>0% Interest EMI</span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <button
                    type="button"
                    className="w-full py-2.5 rounded bg-[#5A413F] text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <ShoppingBag size={14} />
                    {settings.calculator.ctaText}
                  </button>

                  <p className="text-[10px] text-zinc-400 text-center">
                    {settings.calculator.disclaimer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
