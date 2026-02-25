'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { CalendarView, CalendarServicePlan } from '@/components/calendar/CalendarView';
import { useSidebar } from './SidebarContext';

export default function CalendarPage() {
  const { openSidebar } = useSidebar();
  const [plans, setPlans] = useState<CalendarServicePlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<CalendarServicePlan[] | { results: CalendarServicePlan[] }>('/fleet/service-plans/')
      .then((res) => {
        const data = res.data;
        setPlans(Array.isArray(data) ? data : (data.results ?? []));
      })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const handlePlanUpdate = useCallback((updated: CalendarServicePlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  return (
    <CalendarView
      plans={plans}
      loading={loading}
      onPlanUpdate={handlePlanUpdate}
      onOpenSidebar={openSidebar}
    />
  );
}
