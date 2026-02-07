import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useApp } from "@/contexts/AppContext";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";
import {
  mapPendingPrescriptionsToTasks,
  mapPendingInspectionsToTasks,
  type ReviewTask,
} from "@/lib/reviewTasks";
import { listPendingReviewPrescriptions } from "@/lib/prescriptions";
import { apiFetch } from "@/lib/api";
import type { BackendInspection } from "@/contexts/AppContext";
import { formatDateDisplay } from "@/lib/date";
import { Loader2, FileCheck, ClipboardList } from "lucide-react";

interface ReviewTasksModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ReviewTasksModal({ open, onClose }: ReviewTasksModalProps) {
  const navigate = useNavigate();
  const { activeRole } = useApp();
  const role = mapBackendRoleToSemantic(activeRole ?? "");

  const [inspectionTasks, setInspectionTasks] = useState<ReviewTask[]>([]);
  const [prescriptionTasks, setPrescriptionTasks] = useState<ReviewTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUse = can.seeTaskCenter(role);

  const fetchTasks = useCallback(async () => {
    if (!open || !canUse) return;
    setIsLoading(true);
    setError(null);
    try {
      const [pendingPrescriptions, allInspections] = await Promise.all([
        listPendingReviewPrescriptions(),
        apiFetch<BackendInspection[]>("/inspections"),
      ]);
      setPrescriptionTasks(mapPendingPrescriptionsToTasks(pendingPrescriptions));
      setInspectionTasks(mapPendingInspectionsToTasks(allInspections));
    } catch (e) {
      console.error("ReviewTasks fetch error", e);
      setError("Görevler yüklenirken bir hata oluştu.");
      setInspectionTasks([]);
      setPrescriptionTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, [open, canUse]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskClick = (task: ReviewTask) => {
    if (!canUse) return;
    if (task.type === "inspection" && task.gardenId != null) {
      onClose();
      navigate(`/bahce/${task.gardenId}`);
      return;
    }
    if (task.type === "prescription" && task.campusId) {
      onClose();
      navigate(`/bahceler?kampus=${task.campusId}`);
      return;
    }
  };

  if (!canUse) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Görev Merkezi</DialogTitle>
          <DialogDescription className="sr-only">
            Değerlendirme bekleyen denetimler ve onay bekleyen reçeteleri görüntüleyin.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 size={20} className="animate-spin" />
            <span>Yükleniyor…</span>
          </div>
        ) : error ? (
          <p className="py-6 text-center text-destructive">{error}</p>
        ) : (
          <div className="space-y-6">
            {/* Değerlendirme bekleyen denetimler */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <ClipboardList size={16} />
                Değerlendirme bekleyen denetimler
              </h3>
              {inspectionTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Bekleyen denetim yok.</p>
              ) : (
                <ul className="space-y-2">
                  {inspectionTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} />
                  ))}
                </ul>
              )}
            </section>

            {/* Onay bekleyen reçeteler */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-2">
                <FileCheck size={16} />
                Onay bekleyen reçeteler
              </h3>
              {prescriptionTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Bekleyen reçete yok.</p>
              ) : (
                <ul className="space-y-2">
                  {prescriptionTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onClick={() => handleTaskClick(t)} />
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TaskRow({
  task,
  onClick,
}: {
  task: ReviewTask;
  onClick: () => void;
}) {
  const dateLabel = task.createdAt ? formatDateDisplay(task.createdAt) : null;
  const typeLabel = task.type === "inspection" ? "DENETİM" : "REÇETE";

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left px-3 py-2.5 rounded-lg border border-border hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              task.type === "inspection"
                ? "bg-primary/15 text-primary"
                : "bg-green-600/15 text-green-700 dark:text-green-400"
            }`}
          >
            {typeLabel}
          </span>
          <span className="text-sm text-foreground">
            {task.campusName ?? "—"} • {task.gardenName ?? "—"}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted-foreground">{task.statusLabel}</span>
          {dateLabel && (
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          )}
        </div>
      </button>
    </li>
  );
}
