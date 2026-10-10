import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { SalesTarget, UserProfile } from "@/lib/supabase";

export interface SalesTargetModalProps {
  open: boolean;
  onClose: () => void;
  target?: SalesTarget | null;
  users?: UserProfile[];
  onSave: (payload: {
    period: "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly";
    period_start: string;
    period_end: string;
    start_date?: string;
    end_date?: string;
    target_amount: number;
    user_id: string | null;
  }) => Promise<void> | void;
  saving?: boolean;
}

const periods = ["Daily", "Weekly", "Monthly", "Quarterly", "Yearly"] as const;

export function SalesTargetModal({
  open,
  onClose,
  target,
  users = [],
  onSave,
  saving = false,
}: SalesTargetModalProps) {
  const { t } = useI18n();
  const [period, setPeriod] = useState<"Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly">("Monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetAmount, setTargetAmount] = useState<number | string>(100000);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    if (open) {
      if (target) {
        const sDate = (target.period_start || (target as any).start_date || "").slice(0, 10);
        const eDate = (target.period_end || (target as any).end_date || "").slice(0, 10);
        setPeriod(target.period || "Monthly");
        setStartDate(sDate);
        setEndDate(eDate);
        setTargetAmount(target.target_amount !== undefined ? target.target_amount : 100000);
        setUserId(target.user_id || "");
      } else {
        const today = new Date().toISOString().slice(0, 10);
        const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
        setPeriod("Monthly");
        setStartDate(today);
        setEndDate(in30Days);
        setTargetAmount(100000);
        setUserId("");
      }
    }
  }, [open, target]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(targetAmount) || 0;
    const finalStartDate = startDate || new Date().toISOString().slice(0, 10);
    const finalEndDate = endDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    await onSave({
      period,
      period_start: finalStartDate,
      period_end: finalEndDate,
      start_date: finalStartDate,
      end_date: finalEndDate,
      target_amount: amt,
      user_id: userId ? userId : null,
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={target ? (t("edit") || "Edit Sales Target") : (t("salesTarget") || "New Sales Target")}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>{t("period")}</Label>
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {t(p.toLowerCase())}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>{t("startDate")}</Label>
            <Input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t("endDate")}</Label>
            <Input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("targetAmount")}</Label>
          <Input
            type="number"
            min={0}
            step="any"
            required
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="e.g. 500000"
          />
        </div>

        {users && users.length > 0 && (
          <div className="space-y-1.5">
            <Label>Assigned Sales Rep (Optional)</Label>
            <Select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="">All / General Company Target</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            {t("cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            {target ? (t("update") || "Update Target") : (t("save") || "Save Target")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
