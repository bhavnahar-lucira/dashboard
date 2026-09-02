import AdminSidebar from '../../components/common/AdminSidebar';
import AdminAuthGate from '../../components/auth/AdminAuthGate';
import AdminThemeProvider from '../../components/common/AdminThemeProvider';

export default function ProtectedLayout({ children }) {
  return (
    <AdminAuthGate>
      <AdminThemeProvider>
        <div className='flex min-h-screen bg-canvas'>
          <AdminSidebar />
          <main
            className='h-screen flex-1 overflow-y-auto bg-canvas transition-[margin-left] duration-300 ease-out [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-hairline hover:[&::-webkit-scrollbar-thumb]:bg-ink-muted'
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
