'use client';

import { ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Variant {
  id: string;
  name: string;
  price: number;
}

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  pricingType: string;
  recurringInterval: string | null;
  setupFee: number | null;
  variants: Variant[];
}

export default function CheckoutPage() {
  const params = useParams();
  const slug = params.slug as string;
  const serviceId = params.serviceId as string;

  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const wsRes = await fetch('/api/workspaces');
        const workspaces = await wsRes.json();
        const ws = workspaces.find((w: { slug: string }) => w.slug === slug);
        if (!ws) return;

        const res = await fetch(`/api/workspaces/${ws.id}/services/${serviceId}`);
        if (res.ok) {
          const data = await res.json();
          setService(data);
          if (data.variants?.length > 0) {
            setSelectedVariant(data.variants[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, serviceId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-gray-500">Service not found.</p>
      </div>
    );
  }

  const activePrice = selectedVariant
    ? service.variants.find((v) => v.id === selectedVariant)?.price ?? service.price
    : service.price;
  const subtotal = activePrice * quantity;
  const setupFee = service.setupFee ?? 0;
  const total = subtotal + setupFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setError('');

    try {
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">Order Received</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            We&apos;ll be in touch at {email} with next steps.
          </p>
          <Link
            className="mt-6 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
            href={`/portal/${slug}/services`}
          >
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          href={`/portal/${slug}/services`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Services
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">Checkout</h1>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <form className="lg:col-span-3 space-y-4" onSubmit={handleSubmit}>
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Your Details</h2>
              <div className="mt-3 space-y-3">
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Full name"
                  value={name}
                />
                <input
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address *"
                  required
                  type="email"
                  value={email}
                />
              </div>
            </div>

            {service.variants.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Select Option</h2>
                <div className="mt-3 space-y-2">
                  {service.variants.map((v) => (
                    <label
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        selectedVariant === v.id
                          ? 'border-blue-500 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                      key={v.id}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          checked={selectedVariant === v.id}
                          className="h-4 w-4 text-blue-600"
                          name="variant"
                          onChange={() => setSelectedVariant(v.id)}
                          type="radio"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">{v.name}</span>
                      </div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        ${v.price.toFixed(2)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Quantity</h2>
              <input
                className="mt-2 w-24 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                min="1"
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                type="number"
                value={quantity}
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button
              className="w-full rounded-lg bg-blue-600 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={submitting}
              type="submit"
            >
              {submitting ? 'Processing...' : `Place Order — $${total.toFixed(2)}`}
            </button>
          </form>

          <div className="lg:col-span-2">
            <div className="sticky top-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Order Summary</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{service.name}</span>
                  <span className="text-gray-900 dark:text-white">${activePrice.toFixed(2)}</span>
                </div>
                {quantity > 1 && (
                  <div className="flex justify-between text-gray-500">
                    <span>× {quantity}</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                )}
                {setupFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Setup fee</span>
                    <span className="text-gray-900 dark:text-white">${setupFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2 dark:border-gray-700">
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-gray-900 dark:text-white">${total.toFixed(2)}</span>
                  </div>
                  {service.pricingType === 'RECURRING' && service.recurringInterval && (
                    <p className="mt-1 text-xs text-gray-400">
                      Billed {service.recurringInterval.toLowerCase()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
