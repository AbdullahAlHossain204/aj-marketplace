'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils/cn';

export interface AddressData {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  isDefault: boolean;
}

export function CheckoutForm({ addresses, subtotal }: { addresses: AddressData[]; subtotal: number }) {
  const router = useRouter();
  const [addressList, setAddressList] = useState(addresses);
  const [selectedId, setSelectedId] = useState(
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? ''
  );
  const [showNewForm, setShowNewForm] = useState(addresses.length === 0);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    if (!selectedId) {
      setError('Please select or add a shipping address.');
      return;
    }
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shippingAddressId: selectedId, paymentProvider: 'cod' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Could not place your order.');
        setPlacing(false);
        return;
      }
      router.push(`/account/orders/${json.data.id}?placed=1`);
    } catch {
      setError('Something went wrong. Please try again.');
      setPlacing(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-3 font-semibold text-ink-800">Shipping address</h2>
        <div className="flex flex-col gap-2">
          {addressList.map((addr) => (
            <label
              key={addr.id}
              className={cn(
                'flex cursor-pointer flex-col rounded-md border p-3 text-sm',
                selectedId === addr.id ? 'border-brand-600 bg-brand-50' : 'border-ink-200'
              )}
            >
              <div className="flex items-start gap-2">
                <input
                  type="radio"
                  name="address"
                  checked={selectedId === addr.id}
                  onChange={() => setSelectedId(addr.id)}
                  className="mt-1"
                />
                <div>
                  <span className="font-medium text-ink-800">{addr.label}</span>
                  <p className="text-ink-600">
                    {addr.line1}
                    {addr.line2 ? `, ${addr.line2}` : ''}, {addr.city}
                    {addr.region ? `, ${addr.region}` : ''} {addr.postalCode ?? ''}, {addr.country}
                  </p>
                  {addr.phone && <p className="text-ink-400">{addr.phone}</p>}
                </div>
              </div>
            </label>
          ))}
        </div>
        {!showNewForm ? (
          <button
            type="button"
            onClick={() => setShowNewForm(true)}
            className="mt-2 text-sm font-medium text-brand-600 hover:underline"
          >
            + Add a new address
          </button>
        ) : (
          <NewAddressForm
            onCreated={(addr) => {
              setAddressList((prev) => [addr, ...prev]);
              setSelectedId(addr.id);
              setShowNewForm(false);
            }}
            onCancel={() => setShowNewForm(false)}
            allowCancel={addressList.length > 0}
          />
        )}
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      <Button variant="primary" size="lg" onClick={placeOrder} disabled={placing || subtotal === 0}>
        {placing ? 'Placing order…' : 'Place order (Cash on Delivery)'}
      </Button>
    </div>
  );
}

function NewAddressForm({
  onCreated,
  onCancel,
  allowCancel,
}: {
  onCreated: (addr: AddressData) => void;
  onCancel: () => void;
  allowCancel: boolean;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      label: String(form.get('label') || ''),
      line1: String(form.get('line1') || ''),
      line2: String(form.get('line2') || '') || undefined,
      city: String(form.get('city') || ''),
      region: String(form.get('region') || '') || undefined,
      postalCode: String(form.get('postalCode') || '') || undefined,
      country: String(form.get('country') || ''),
      phone: String(form.get('phone') || '') || undefined,
      isDefault: form.get('isDefault') === 'on',
    };

    const res = await fetch('/api/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(json.error?.message ?? 'Could not save address.');
      return;
    }
    onCreated(json.data);
  }

  return (
    <form onSubmit={onSubmit} className="mt-3 flex flex-col gap-3 rounded-md border border-ink-200 p-4">
      <div className="grid grid-cols-2 gap-3">
        <Input name="label" placeholder="Label (e.g. Home)" required />
        <Input name="phone" placeholder="Phone" />
      </div>
      <Input name="line1" placeholder="Address line 1" required />
      <Input name="line2" placeholder="Address line 2 (optional)" />
      <div className="grid grid-cols-3 gap-3">
        <Input name="city" placeholder="City" required />
        <Input name="region" placeholder="Region" />
        <Input name="postalCode" placeholder="Postal code" />
      </div>
      <Input name="country" placeholder="Country" required />
      <label className="flex items-center gap-2 text-sm text-ink-600">
        <input type="checkbox" name="isDefault" /> Set as default address
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save address'}
        </Button>
        {allowCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
