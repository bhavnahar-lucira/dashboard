import AdminSidebar from '../../components/common/AdminSidebar';
import AdminAuthGate from '../../components/auth/AdminAuthGate';
import AdminThemeProvider from '../../components/common/AdminThemeProvider';

export default function ProtectedLayout({ children }) {
  return (
    <AdminAuthGate>
      <AdminThemeProvider>
        <div className='flex min-h-screen bg-[#f6f6f7]'>
          <AdminSidebar />
          <main
            className='h-screen flex-1 overflow-y-auto bg-[#f6f6f7] transition-[margin-left] duration-300 ease-out [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#d1d5db] hover:[&::-webkit-scrollbar-thumb]:bg-[#9ca3af]'
            style={{ marginLeft: 'var(--admin-sidebar-w, 17.5rem)' }}
          >
            <div className='mx-auto max-w-[1600px]'>
              {children}
            </div>
          </main>
        </div>
      </AdminThemeProvider>
    </AdminAuthGate>
  );
}
