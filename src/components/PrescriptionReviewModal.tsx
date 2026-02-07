import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  getPrescription,
  type Prescription,
} from "@/lib/prescriptions";
import { useApp } from "@/contexts/AppContext";
import { Trash2, CheckCircle2 } from "lucide-react";
import ExpandableNote from "@/components/ExpandableNote";

interface PrescriptionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  prescriptionId: number;
  onReviewed: () => void;
}

const PrescriptionReviewModal = ({
  isOpen,
  onClose,
  prescriptionId,
  onReviewed,
}: PrescriptionReviewModalProps) => {
  const { toast } = useToast();
  const { reviewPrescription: reviewPrescriptionFromContext } = useApp();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen && prescriptionId) {
      const loadPrescription = async () => {
        try {
          const data = await getPrescription(prescriptionId);
          setPrescription(data);
        } catch (error) {
          console.error("Failed to load prescription:", error);
      toast({
        title: "Hata",
        description: "Reçete yüklenirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
          onClose();
        }
      };
      loadPrescription();
    }
  }, [isOpen, prescriptionId, onClose, toast]);

  const handleApprove = async () => {
    if (!prescriptionId || isApproving || isLoading) return;

    try {
      setIsApproving(true);
      await reviewPrescriptionFromContext(prescriptionId, "approved");
      toast({
        title: "Reçete onaylandı",
        description: "Reçete başarıyla onaylandı ve güncel reçete olarak işaretlendi.",
        duration: 2500,
      });
      onReviewed();
      onClose();
    } catch (error: any) {
      console.error("Approve prescription error:", error);
      toast({
        title: "Hata",
        description: error.message || "Reçete onaylanırken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!prescriptionId || isDeleting || isLoading) return;

    try {
      setIsDeleting(true);
      // Delete prescription using review with rejected status (backend deletes it)
      await reviewPrescriptionFromContext(prescriptionId, "rejected");
      toast({
        title: "Reçete silindi",
        description: "Reçete başarıyla silindi.",
        duration: 2000,
      });
      onReviewed();
      onClose();
    } catch (error: any) {
      console.error("Delete prescription error:", error);
      toast({
        title: "Hata",
        description: error.message || "Reçete silinirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (!prescription) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reçete İnceleme - {prescription.campus?.name}</DialogTitle>
          <DialogDescription>
            Reçeteyi onaylayabilir veya silebilirsiniz.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Havalandırma</Label>
            <div className="p-3 bg-muted rounded-lg">
              <ExpandableNote text={prescription.ventilation} label="" placeholder="Belirtilmemiş" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sulama</Label>
            <div className="p-3 bg-muted rounded-lg">
              <ExpandableNote text={prescription.irrigation} label="" placeholder="Belirtilmemiş" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gübreleme</Label>
            <div className="p-3 bg-muted rounded-lg">
              <ExpandableNote text={prescription.fertilization} label="" placeholder="Belirtilmemiş" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleDelete}
            disabled={isApproving || isDeleting || isLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 size={18} />
            <span>{isDeleting ? "Siliniyor..." : "Sil"}</span>
          </button>
          <button
            onClick={handleApprove}
            disabled={isApproving || isDeleting || isLoading}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 size={18} />
            <span>{isApproving ? "Onaylanıyor..." : "Onayla"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionReviewModal;
