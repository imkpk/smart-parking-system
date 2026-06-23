import { ReactNode, useEffect, useState } from 'react';
import { PlanLimitUpgradeDialog } from '../components/billing/PlanLimitUpgradeDialog';
import { PLAN_LIMIT_EVENT, PlanLimitDetail } from '../lib/planLimitError';

export function PlanLimitProvider({ children }: { children: ReactNode }) {
  const [detail, setDetail] = useState<PlanLimitDetail | null>(null);

  useEffect(() => {
    const handlePlanLimit = (event: Event) => {
      const customEvent = event as CustomEvent<PlanLimitDetail>;
      setDetail(customEvent.detail);
    };

    window.addEventListener(PLAN_LIMIT_EVENT, handlePlanLimit);

    return () => {
      window.removeEventListener(PLAN_LIMIT_EVENT, handlePlanLimit);
    };
  }, []);

  return (
    <>
      {children}
      <PlanLimitUpgradeDialog
        onClose={() => setDetail(null)}
        open={Boolean(detail)}
        resource={detail?.resource}
      />
    </>
  );
}