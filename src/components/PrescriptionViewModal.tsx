import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  getLatestPrescriptionByCampus,
  getPrescriptionEffectiveDate,
  type Prescription,
} from "@/lib/prescriptions";
import ExpandableNote from "@/components/ExpandableNote";

interface PrescriptionViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  campusId: string;
  campusName: string;
  prescription?: Prescription | null;
}

const PrescriptionViewModal = ({
  isOpen,
  onClose,
  campusId,
  campusName,
  prescription: prescriptionProp,
}: PrescriptionViewModalProps) => {
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deferContent, setDeferContent] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setDeferContent(true);
      const t = setTimeout(() => setDeferContent(false), 60);
      return () => clearTimeout(t);
    } else {
      setDeferContent(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      // If prescription is passed as prop, use it; otherwise load from API
      if (prescriptionProp) {
        setPrescription(prescriptionProp);
      } else {
        const loadPrescription = async () => {
          try {
            setIsLoading(true);
            const data = await getLatestPrescriptionByCampus(campusId);
            setPrescription(data ?? null);
          } catch {
            setPrescription(null);
          } finally {
            setIsLoading(false);
          }
        };
        loadPrescription();
      }
    }
  }, [isOpen, campusId, prescriptionProp]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto duration-150 ease-out">
        <DialogHeader>
          <DialogTitle>Güncel Reçete - {campusName}</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground">
            {!deferContent && (() => {
              const approvedDateLabel = getPrescriptionEffectiveDate(prescription);
              return approvedDateLabel ? (
                <span className="block mt-1">Onay Tarihi: {approvedDateLabel}</span>
              ) : null;
            })()}
          </DialogDescription>
        </DialogHeader>

        {deferContent ? (
          <div className="p-4 space-y-3">
            <div className="h-5 w-40 rounded bg-muted animate-pulse" />
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-muted animate-pulse" />
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Yükleniyor...
          </div>
        ) : !prescription ? (
          <div className="py-8 text-center text-muted-foreground">
            <p>Bu kampüs için onaylanmış reçete bulunmamaktadır.</p>
          </div>
        ) : (
          <div>
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
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button onClick={onClose} className="flex-1">
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionViewModal;
