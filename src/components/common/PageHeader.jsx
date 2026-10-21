import { cn } from '../../lib/utils';

/**
 * Standard page header for every dashboard screen: icon chip, title,
 * optional subtitle, and a right-hand slot for actions/status.
 *
 * Presentation only — it renders whatever the page passes in.
 */
export default function PageHeader({ icon: Icon, title, subtitle, actions, className }) {
  return (
    <div
      className={cn(
        'mb-8 flex flex-col gap-4 md:flex-row md:items-start md:justify-between',
        className
      )}
    >
      <div className='flex items-start gap-4'>
        {Icon && (
          <span className='grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white border border-[#e1e3e5] text-[#202223] shadow-xs'>
            <Icon size={20} strokeWidth={1.9} />
          </span>
        )}
        <div className='min-w-0'>
          <h1 className='text-2xl font-bold tracking-tight text-[#202223]'>{title}</h1>
          {subtitle && <p className='text-sm text-[#5c5f62] mt-1 font-normal'>{subtitle}</p>}
        </div>
      </div>

      {actions && <div className='flex flex-wrap items-center gap-2.5'>{actions}</div>}
    </div>
  );
}

/** Pill used for passive status readouts in the header actions slot. */
export function StatusPill({ children, tone = 'neutral', pulse = false }) {
  const tones = {
    neutral: 'bg-white border-[#e1e3e5] text-[#202223] shadow-2xs',
    success: 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]',
    brand: 'bg-[#f1f2f4] border-[#e1e3e5] text-[#202223]',
  };
  const dots = {
    neutral: 'bg-[#8c9196]',
    success: 'bg-emerald-500',
    brand: 'bg-[#202223]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold tracking-wide',
        tones[tone] || tones.neutral
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', dots[tone] || dots.neutral, pulse && 'animate-pulse')} />
      {children}
    </span>
  );
}
