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
          <span className='grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-tint text-brand'>
            <Icon size={20} strokeWidth={1.9} />
          </span>
        )}
        <div className='min-w-0'>
          <h1 className='admin-title'>{title}</h1>
          {subtitle && <p className='admin-subtitle'>{subtitle}</p>}
        </div>
      </div>

      {actions && <div className='flex flex-wrap items-center gap-2.5'>{actions}</div>}
    </div>
  );
}

/** Pill used for passive status readouts in the header actions slot. */
export function StatusPill({ children, tone = 'neutral', pulse = false }) {
  const tones = {
    neutral: 'bg-panel border-hairline text-ink-soft',
    success: 'bg-ok-bg border-transparent text-ok-fg',
    brand: 'bg-brand-tint border-transparent text-brand',
  };
  const dots = {
    neutral: 'bg-ink-muted',
    success: 'bg-ok-fg',
    brand: 'bg-brand',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em]',
        tones[tone] || tones.neutral
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone] || dots.neutral, pulse && 'animate-pulse')} />
      {children}
    </span>
  );
}
