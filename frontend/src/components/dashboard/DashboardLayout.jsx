import { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DashboardSidebar } from "./DashboardSidebar";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const API_BASE = "http://127.0.0.1:8000";

export function DashboardLayout() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userId, setUserId] = useState(null);
  const [latestIncome, setLatestIncome] = useState(null);
  const [monthlyIncomeTotal, setMonthlyIncomeTotal] = useState(null);
  const [isLoadingIncomeTotal, setIsLoadingIncomeTotal] = useState(true);
  const [isSavingIncome, setIsSavingIncome] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const getIncomeStorageKey = useCallback(
    (uid) => (uid ? `ww:last-income:${uid}` : null),
    []
  );

  const persistLastIncome = useCallback(
    (uid, income) => {
      const key = getIncomeStorageKey(uid);
      if (!key || !income) return;
      const payload = {
        amount: income.amount,
        frequency: income.income_type || income.frequency || "monthly",
        source: income.source || "",
        note: income.note || "",
        receivedDate: income.received_date || income.receivedDate || new Date().toISOString().slice(0, 10),
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (err) {
        // Ignore storage errors.
      }
    },
    [getIncomeStorageKey]
  );

  const fetchMonthlyIncomeTotal = useCallback(
    async (uid, month, year) => {
      if (!uid) return;
      setIsLoadingIncomeTotal(true);
      try {
        const body = await api.getIncomeTotal(month, year);
        setMonthlyIncomeTotal(typeof body.total === "number" ? body.total : 0);
      } catch (err) {
        toast({ title: "Unable to load income total", description: err?.message || "Please try again." });
      } finally {
        setIsLoadingIncomeTotal(false);
      }
    },
    []
  );

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        const uid = data?.session?.user?.id || "test_user_123"; // Fallback for dev
        setUserId(uid);

        const body = await api.getLatestIncome();
        const hasIncome = body?.amount !== null && body?.amount !== undefined;
        if (hasIncome) {
          setLatestIncome(body);
          persistLastIncome(uid, body);
        }
        // Fetch current month's income total
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        await fetchMonthlyIncomeTotal(uid, currentMonth, currentYear);
      } catch (err) {
        toast({ title: "Unable to check income", description: err?.message || "Please try again." });
      }
    };

    init();

    return () => {
      active = false;
    };
  }, [fetchMonthlyIncomeTotal, persistLastIncome]); // Added fetchMonthlyIncomeTotal as a dependency

  const handleSaveIncome = useCallback(
    async ({ amount, income_type, source, note, received_date }) => {
      if (!userId) throw new Error("User not available");
      try {
        setIsSavingIncome(true);
        const created = await api.createIncome({
          amount,
          income_type,
          source,
          note,
          received_date,
        });
        setLatestIncome(created);
        persistLastIncome(userId, created);
        await fetchMonthlyIncomeTotal(userId, created.month, created.year);
        toast({ title: "Income saved", description: "You're good to go." });
      } catch (err) {
        toast({ title: "Income not saved", description: err?.message || "Please try again." });
        throw err;
      } finally {
        setIsSavingIncome(false);
      }
    },
    [fetchMonthlyIncomeTotal, userId]
  );

  const handleCopyPrevious = useCallback(async () => {
    if (!userId) throw new Error("User not available");
    try {
      setIsSavingIncome(true);
      const created = await api.copyPreviousIncome();
      setLatestIncome(created);
      persistLastIncome(userId, created);
      toast({ title: "Income copied", description: "Using your previous income." });
    } catch (err) {
      toast({ title: "Unable to reuse income", description: err?.message || "Please try again." });
      throw err;
    } finally {
      setIsSavingIncome(false);
    }
  }, [userId]);

  const triggerRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <DashboardSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div
        className={cn(
          "transition-all duration-300 bg-background",
          sidebarCollapsed ? "ml-[70px]" : "ml-[260px]"
        )}
      >
        <main className="p-6 bg-background min-h-screen">
          <Outlet
            context={{
              latestIncome,
              userId,
              handleSaveIncome,
              handleCopyPrevious,
              monthlyIncomeTotal,
              isLoadingIncomeTotal,
              isSavingIncome,
              triggerRefresh,
              refreshKey,
            }}
          />
        </main>
      </div>
    </div>
  );
}