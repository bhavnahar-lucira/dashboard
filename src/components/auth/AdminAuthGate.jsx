'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { isHrefAllowed } from '../../lib/adminNav';

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

    if (!isHrefAllowed(role, pathname)) {
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
