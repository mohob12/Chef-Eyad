import { Fragment, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useI18n } from '../lib/i18n';
import { STATUS_FLOW, formatTime } from '../lib/format';
import { playOrderAlertChime, type OrderAlertVariant } from '../lib/orderAudio';
import type { DeliveryFeeStatus, OrderStatus, OrderType } from '../lib/types';

const ICONS: Partial<Record<OrderStatus, string>> = {
  new: '📝',
  confirmed: '👍',
  preparing: '👨‍🍳',
  ready: '🛎️',
  out_for_delivery: '🛵',
  completed: '🎉',
};

type StepState = 'done' | 'current' | 'todo';

export default function OrderTracker({
  type,
  status,
  since,
  feeStatus,
}: {
  type: OrderType;
  status: OrderStatus;
  since?: string | null;
  feeStatus: DeliveryFeeStatus;
}) {
  const { t, locale } = useI18n();
  const steps = STATUS_FLOW[type];
  const current = steps.indexOf(status);
  const finished = status === 'completed';

  // Only a step reached while the page is open gets the "pop" animation.
  const prev = useRef(current);
  const [justReached, setJustReached] = useState<number | null>(null);
  const playedAlertsRef = useRef<Set<string>>(new Set());

  const isAlertState = status === 'ready' || status === 'out_for_delivery' || status === 'completed';

  useEffect(() => {
    if (current > prev.current) {
      setJustReached(current);
      prev.current = current;
      const id = setTimeout(() => setJustReached(null), 1500);
      return () => clearTimeout(id);
    }
    prev.current = current;
  }, [current]);

  // Distinctive Sound alert trigger for ready, out_for_delivery, and completed
  useEffect(() => {
    if (isAlertState) {
      const alreadyPlayed = playedAlertsRef.current.has(status);
      // Play sound if status changed while user is observing, or if arrived/refreshed recently (< 90 seconds)
      const isRecent = since ? Date.now() - new Date(since).getTime() < 90_000 : false;
      const shouldPlay = !alreadyPlayed && (current > prev.current || isRecent);

      if (shouldPlay) {
        playedAlertsRef.current.add(status);
        playOrderAlertChime(status as OrderAlertVariant);

        // Flash document title for tab awareness
        const originalTitle = document.title;
        const prefix = status === 'ready' ? '🛎️ طلبك جاهز!' : status === 'out_for_delivery' ? '🛵 في الطريق!' : '🎉 تم التسليم!';
        document.title = `${prefix} | Chef Eyad`;
        const timer = setTimeout(() => {
          document.title = originalTitle;
        }, 9000);
        return () => clearTimeout(timer);
      }
    }
  }, [status, current, since, isAlertState]);

  const label = (s: OrderStatus) => t(s === 'new' ? 'track.s.new' : `status.${s}`);
  const description =
    status === 'ready'
      ? t(`track.d.ready.${type}`)
      : status === 'new' && type === 'delivery' && feeStatus === 'pending'
        ? t('track.d.new_delivery')
        : t(`track.d.${status}`);

  if (status === 'cancelled' || status === 'rejected') {
    return (
      <section className="card card-pad tracker-failed" role="status" data-testid="order-status">
        <span className="tf-x" aria-hidden="true">
          ✕
        </span>
        <div>
          <strong>{t(`status.${status}`)}</strong>
          <p>{description}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="card card-pad tracker-card">
      <h2 style={{ marginBottom: 16 }}>{t('track.title')}</h2>

      {/* Prominent Alert Banner when Ready, In Delivery, or Completed */}
      {isAlertState && (
        <div className={`tracker-alert-banner ${status}`} role="alert">
          <div className="tracker-alert-icon" aria-hidden="true">
            {status === 'ready' ? '🛎️' : status === 'out_for_delivery' ? '🛵' : '🎉'}
          </div>
          <div className="tracker-alert-content">
            <div className="tracker-alert-title">
              {status === 'ready'
                ? t('track.sound.readyBanner')
                : status === 'out_for_delivery'
                  ? t('track.sound.deliveryBanner')
                  : t('track.sound.completedBanner')}
            </div>
            <div className="tracker-alert-desc">{description}</div>
          </div>
        </div>
      )}

      <ol className="tracker" data-testid="order-tracker" data-type={type}>
        {steps.map((s, i) => {
          const state: StepState = i < current || (finished && i === current) ? 'done' : i === current ? 'current' : 'todo';
          const link: StepState = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <Fragment key={s}>
              <li
                className={`tstep ${state} ${justReached === i ? 'pop' : ''}`}
                data-testid="tracker-step"
                data-status={s}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
              >
                <span className="tdot" aria-hidden="true">
                  {state === 'done' ? '✓' : ICONS[s]}
                </span>
                <span className="tlabel">
                  {label(s)}
                  {i === current && since && <small className="num">{t('track.since', { time: formatTime(since, locale) })}</small>}
                </span>
              </li>
              {i < steps.length - 1 && (
                <li
                  role="presentation"
                  className={`tlink ${link}`}
                  data-testid="tracker-link"
                  data-state={link}
                  style={{ '--i': i } as CSSProperties}
                />
              )}
            </Fragment>
          );
        })}
      </ol>
      <div className={`tracker-now ${finished ? 'finished' : ''}`} role="status" aria-live="polite" data-testid="order-status">
        <strong>{label(status)}</strong>
        <span>{description}</span>
      </div>

      {/* Sound notification info bar for active preparation states */}
      {!isAlertState && (
        <div className="tracker-sound-bar">
          <span className="tracker-sound-info">
            <span>🔔</span>
            <span>{t('track.sound.active')} — {t('track.sound.hint')}</span>
          </span>
        </div>
      )}
    </section>
  );
}
