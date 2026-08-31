import AdminSidebar from '../../components/common/AdminSidebar';
import AdminAuthGate from '../../components/auth/AdminAuthGate';

export default function ProtectedLayout({ children }) {
  return (
    <AdminAuthGate>
      <div className='min-h-screen bg-zinc-50 flex'>
        <AdminSidebar />
        <main className='flex-1 ml-72 h-screen overflow-y-auto'>
          <div className='max-w-[1600px] mx-auto'>
            {children}
          </div>
        </main>
      </div>
    </AdminAuthGate>
  );
}
