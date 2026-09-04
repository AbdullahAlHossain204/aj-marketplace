"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../../lib/AuthContext";
import { AdminBanner, AdminFeaturedProduct, AdminFlashSale, formatPrice } from "../../../lib/types";

export default function AdminMarketingPage() {
  const { authFetch } = useAuth();

  const [flashSales, setFlashSales] = useState<AdminFlashSale[] | null>(null);
  const [banners, setBanners] = useState<AdminBanner[] | null>(null);
  const [featured, setFeatured] = useState<AdminFeaturedProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Flash sale form
  const [fsName, setFsName] = useState("");
  const [fsDiscountType, setFsDiscountType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [fsDiscountValue, setFsDiscountValue] = useState(10);
  const [fsStartsAt, setFsStartsAt] = useState("");
  const [fsEndsAt, setFsEndsAt] = useState("");
  const [fsProductIds, setFsProductIds] = useState("");
  const [fsError, setFsError] = useState<string | null>(null);

  // Banner form
  const [bTitle, setBTitle] = useState("");
  const [bImageUrl, setBImageUrl] = useState("");
  const [bLinkUrl, setBLinkUrl] = useState("");
  const [bPlacement, setBPlacement] = useState<"HOMEPAGE_HERO" | "HOMEPAGE_SECONDARY" | "CATEGORY_TOP">(
    "HOMEPAGE_HERO"
  );
  const [bError, setBError] = useState<string | null>(null);

  // Featured form
  const [fpProductId, setFpProductId] = useState("");
  const [fpError, setFpError] = useState<string | null>(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    const [fsRes, bRes, fpRes] = await Promise.all([
      authFetch<AdminFlashSale[]>("/api/v1/admin/marketing/flash-sales"),
      authFetch<AdminBanner[]>("/api/v1/admin/marketing/banners"),
      authFetch<AdminFeaturedProduct[]>("/api/v1/admin/marketing/featured"),
    ]);
    if (fsRes.success && fsRes.data) setFlashSales(fsRes.data);
    if (bRes.success && bRes.data) setBanners(bRes.data);
    if (fpRes.success && fpRes.data) setFeatured(fpRes.data);
    if (!fsRes.success) setError(fsRes.error?.message ?? "Could not load marketing data");
  }

  async function handleCreateFlashSale() {
    setFsError(null);
    const productIds = fsProductIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const res = await authFetch("/api/v1/admin/marketing/flash-sales", {
      method: "POST",
      body: JSON.stringify({
        name: fsName,
        discountType: fsDiscountType,
        discountValue: fsDiscountValue,
        startsAt: fsStartsAt,
        endsAt: fsEndsAt,
        productIds,
      }),
    });
    if (res.success) {
      setFsName("");
      setFsProductIds("");
      load();
    } else {
      setFsError(res.error?.message ?? "Could not create flash sale");
    }
  }

  async function handleDeactivateFlashSale(id: string) {
    if (!confirm("End this flash sale?")) return;
    await authFetch(`/api/v1/admin/marketing/flash-sales/${id}`, { method: "DELETE" });
    load();
  }

  async function handleCreateBanner() {
    setBError(null);
    const res = await authFetch("/api/v1/admin/marketing/banners", {
      method: "POST",
      body: JSON.stringify({
        title: bTitle,
        imageUrl: bImageUrl,
        linkUrl: bLinkUrl || undefined,
        placement: bPlacement,
      }),
    });
    if (res.success) {
      setBTitle("");
      setBImageUrl("");
      setBLinkUrl("");
      load();
    } else {
      setBError(res.error?.message ?? "Could not create banner");
    }
  }

  async function handleDeleteBanner(id: string) {
    if (!confirm("Delete this banner?")) return;
    await authFetch(`/api/v1/admin/marketing/banners/${id}`, { method: "DELETE" });
    load();
  }

  async function handleAddFeatured() {
    setFpError(null);
    const res = await authFetch("/api/v1/admin/marketing/featured", {
      method: "POST",
      body: JSON.stringify({ productId: fpProductId, displayOrder: featured?.length ?? 0 }),
    });
    if (res.success) {
      setFpProductId("");
      load();
    } else {
      setFpError(res.error?.message ?? "Could not feature product");
    }
  }

  async function handleRemoveFeatured(productId: string) {
    await authFetch(`/api/v1/admin/marketing/featured/${productId}`, { method: "DELETE" });
    load();
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!flashSales || !banners || !featured) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-bold">Marketing</h1>

      {/* ---- Flash Sales ---- */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Flash Sales</h2>
        <p className="mb-3 text-sm text-gray-500">
          Time-boxed campaign discounts. A product can only be in one active sale at a time.
        </p>

        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
            <input value={fsName} onChange={(e) => setFsName(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Discount type</label>
            <select value={fsDiscountType} onChange={(e) => setFsDiscountType(e.target.value as any)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED">Fixed amount</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Value</label>
            <input type="number" min={1} value={fsDiscountValue} onChange={(e) => setFsDiscountValue(Number(e.target.value))} className="w-24 rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Starts</label>
            <input type="datetime-local" value={fsStartsAt} onChange={(e) => setFsStartsAt(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Ends</label>
            <input type="datetime-local" value={fsEndsAt} onChange={(e) => setFsEndsAt(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">Product IDs (comma-separated)</label>
            <input value={fsProductIds} onChange={(e) => setFsProductIds(e.target.value)} placeholder="uuid1, uuid2..." className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <button onClick={handleCreateFlashSale} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Create
          </button>
        </div>
        {fsError && <p className="mb-3 text-sm text-red-600">{fsError}</p>}

        <div className="flex flex-col gap-2">
          {flashSales.map((fs) => (
            <div key={fs.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <div>
                <span className="font-medium">{fs.name}</span>{" "}
                <span className="text-gray-500">
                  ({fs.discountType === "PERCENTAGE" ? `${fs.discountValue}%` : formatPrice(fs.discountValue, "BDT")} off · {fs.products.length} product(s))
                </span>
                <span className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${fs.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                  {fs.isActive ? "Active" : "Ended"}
                </span>
              </div>
              {fs.isActive && (
                <button onClick={() => handleDeactivateFlashSale(fs.id)} className="text-red-600 hover:underline">
                  End now
                </button>
              )}
            </div>
          ))}
          {flashSales.length === 0 && <p className="text-sm text-gray-500">No flash sales yet.</p>}
        </div>
      </section>

      {/* ---- Banners ---- */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Banners</h2>

        <div className="mb-4 flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Title</label>
            <input value={bTitle} onChange={(e) => setBTitle(e.target.value)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-medium text-gray-600">Image URL</label>
            <input value={bImageUrl} onChange={(e) => setBImageUrl(e.target.value)} placeholder="https://..." className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Link (optional)</label>
            <input value={bLinkUrl} onChange={(e) => setBLinkUrl(e.target.value)} placeholder="/products?category=..." className="rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Placement</label>
            <select value={bPlacement} onChange={(e) => setBPlacement(e.target.value as any)} className="rounded-md border border-gray-300 px-2 py-1.5 text-sm">
              <option value="HOMEPAGE_HERO">Homepage Hero</option>
              <option value="HOMEPAGE_SECONDARY">Homepage Secondary</option>
              <option value="CATEGORY_TOP">Category Top</option>
            </select>
          </div>
          <button onClick={handleCreateBanner} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Create
          </button>
        </div>
        {bError && <p className="mb-3 text-sm text-red-600">{bError}</p>}

        <div className="flex flex-col gap-2">
          {banners.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <span>
                <span className="font-medium">{b.title}</span>{" "}
                <span className="text-gray-500">({b.placement})</span>
              </span>
              <button onClick={() => handleDeleteBanner(b.id)} className="text-red-600 hover:underline">
                Delete
              </button>
            </div>
          ))}
          {banners.length === 0 && <p className="text-sm text-gray-500">No banners yet.</p>}
        </div>
      </section>

      {/* ---- Featured Products ---- */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Featured Products</h2>

        <div className="mb-4 flex items-end gap-2 rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-600">Product ID</label>
            <input value={fpProductId} onChange={(e) => setFpProductId(e.target.value)} placeholder="uuid" className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <button onClick={handleAddFeatured} className="rounded-md bg-brand-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-700">
            Feature
          </button>
        </div>
        {fpError && <p className="mb-3 text-sm text-red-600">{fpError}</p>}

        <div className="flex flex-col gap-2">
          {featured.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 text-sm">
              <span className="font-medium">{f.product.name}</span>
              <button onClick={() => handleRemoveFeatured(f.productId)} className="text-red-600 hover:underline">
                Remove
              </button>
            </div>
          ))}
          {featured.length === 0 && <p className="text-sm text-gray-500">No featured products yet.</p>}
        </div>
      </section>
    </div>
  );
}
