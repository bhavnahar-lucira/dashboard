'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AdminAuthGate({ children }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = localStorage.getItem('lucira_admin_auth');
    const role = localStorage.getItem('lucira_admin_role') || 'admin';

    if (auth !== 'true') {
      router.push('/');
      return;
    }

    let allowed = false;
    if (role === 'admin') {
      allowed = true;
    } else if (role === 'marketing') {
      allowed = ['/dashboard', '/dashboard/revalidate', '/dashboard/update-rate', '/dashboard/curated-looks', '/dashboard/styled-videos', '/dashboard/styled-videos-collection', '/dashboard/from-same-collection'].includes(pathname);
    } else if (role === 'cro') {
      allowed = ['/dashboard', '/dashboard/payments', '/dashboard/carts', '/dashboard/wishlists', '/dashboard/user-activity'].includes(pathname);
    }

    if (!allowed) {
      router.push('/dashboard');
    } else {
      setIsAuthorized(true);
    }
  }, [router, pathname]);

  if (!isAuthorized) {
    return (
      <div className='min-h-screen bg-zinc-950 flex items-center justify-center'>
        <Loader2 className='animate-spin text-zinc-500' size={40} />
      </div>
    );
  }

  return children;
}
