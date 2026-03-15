'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { CalendarView, CalendarServicePlan, CalendarInspection } from '@/components/calendar/CalendarView';
import { useSidebar } from './SidebarContext';

function extractResults<T>(data: T[] | { results: T[] }): T[] {
  return Array.isArray(data) ? data : (data.results ?? []);
}

export default function CalendarPage() {
  const { openSidebar } = useSidebar();
  const [plans, setPlans] = useState<CalendarServicePlan[]>([]);
  const [inspections, setInspections] = useState<CalendarInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CalendarServicePlan[] | { results: CalendarServicePlan[] }>('/fleet/service-plans/'),
      api.get<CalendarInspection[] | { results: CalendarInspection[] }>('/fleet/calendar-inspections/'),
    ])
      .then(([plansRes, inspRes]) => {
        setPlans(extractResults(plansRes.data));
        setInspections(extractResults(inspRes.data));
      })
      .catch(() => {
        setPlans([]);
        setInspections([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePlanUpdate = useCallback((updated: CalendarServicePlan) => {
    setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  }, []);

  return (
    <CalendarView
      plans={plans}
      inspections={inspections}
      loading={loading}
      onPlanUpdate={handlePlanUpdate}
      onOpenSidebar={openSidebar}
    />
  );
}
