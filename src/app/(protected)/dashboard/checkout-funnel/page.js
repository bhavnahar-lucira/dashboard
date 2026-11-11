import { redirect } from 'next/navigation';

// The Checkout Funnel page grew into Journey Analytics; keep old links working.
export default function CheckoutFunnelRedirect() {
  redirect('/dashboard/journey-analytics');
}
