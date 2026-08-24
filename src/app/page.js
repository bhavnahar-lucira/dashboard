'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Lock, User } from 'lucide-react';
import { toast } from 'react-toastify';

export default function LoginPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setIsOpen(true);
    if (localStorage.getItem('lucira_admin_auth') === 'true') {
      router.push('/dashboard');
    }
  }, [router]);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);

    const users = {
      admin: { password: 'admin@1985', role: 'admin' },
      marketing: { password: 'marketing@1985', role: 'marketing' },
      cro: { password: 'cro@1985', role: 'cro' }
    };

    const user = users[username];

    if (user && user.password === password) {
      localStorage.setItem('lucira_admin_auth', 'true');
      localStorage.setItem('lucira_admin_role', user.role);
      toast.success(`Access Granted (${user.role})`);
      router.push('/dashboard');
    } else {
      toast.error('Invalid Credentials');
    }
    setLoading(false);
  };

  return (
    <div className='min-h-screen bg-zinc-950 flex items-center justify-center relative overflow-hidden'>
      <div className='absolute inset-0 opacity-20'>
         <div className='absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-500 blur-[120px] rounded-full'></div>
         <div className='absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#5A413F] blur-[120px] rounded-full'></div>
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => !open && setIsOpen(true)}>
        <DialogContent className='sm:max-w-[400px] border-zinc-800 bg-zinc-900 text-zinc-100 shadow-2xl'>
          <DialogHeader className='items-center text-center space-y-3'>
            <div className='w-16 h-16 bg-[#5A413F] rounded-2xl flex items-center justify-center mb-2 shadow-lg shadow-[#5A413F]/20'>
               <Lock size={32} className='text-white' />
            </div>
            <DialogTitle className='text-2xl font-black tracking-tight'>Lucira Admin Access</DialogTitle>
            <DialogDescription className='text-zinc-400'>
              Please enter your credentials to manage the storefront services.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleLogin} className='space-y-6 py-4'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='username'>Username</Label>
                <div className='relative'>
                  <User size={18} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500' />
                  <Input 
                    id='username' 
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder='admin' 
                    className='bg-zinc-800 border-zinc-700 pl-10 focus:ring-[#5A413F] focus:border-[#5A413F]' 
                    required
                  />
                </div>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='password'>Password</Label>
                <div className='relative'>
                  <Lock size={18} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500' />
                  <Input 
                    id='password' 
                    type='password' 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder='Password' 
                    className='bg-zinc-800 border-zinc-700 pl-10 focus:ring-[#5A413F] focus:border-[#5A413F]' 
                    required
                  />
                </div>
              </div>
            </div>

            <Button 
              type='submit' 
              disabled={loading}
              className='w-full bg-[#5A413F] hover:bg-[#4A312F] text-white py-6 rounded-xl font-bold text-sm tracking-widest'
            >
              {loading ? 'AUTHENTICATING...' : 'UNLOCK DASHBOARD'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
