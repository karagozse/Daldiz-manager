import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  type Prescription,
} from "@/lib/prescriptions";
import { useApp } from "@/contexts/AppContext";
import { Send, X } from "lucide-react";

interface PrescriptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  campusId: string;
  campusName: string;
  mode?: "create" | "edit"; // Optional for backward compatibility
  prescriptionId?: number;
  onSaved: () => void;
}

const PrescriptionFormModal = ({
  isOpen,
  onClose,
  campusId,
  campusName,
  mode,
  prescriptionId,
  onSaved,
}: PrescriptionFormModalProps) => {
  const { toast } = useToast();
  const { createPrescription } = useApp();
  const [ventilation, setVentilation] = useState("");
  const [irrigation, setIrrigation] = useState("");
  const [fertilization, setFertilization] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Validation errors
  const [errors, setErrors] = useState({
    ventilation: "",
    irrigation: "",
    fertilization: "",
  });
  
  // Validation touched state (to show errors only after user interaction)
  const [touched, setTouched] = useState({
    ventilation: false,
    irrigation: false,
    fertilization: false,
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setVentilation("");
      setIrrigation("");
      setFertilization("");
      setErrors({
        ventilation: "",
        irrigation: "",
        fertilization: "",
      });
      setTouched({
        ventilation: false,
        irrigation: false,
        fertilization: false,
      });
    }
  }, [isOpen]);
  
  // Validate a single field
  const validateField = (name: "ventilation" | "irrigation" | "fertilization", value: string) => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return "Bu alan boş bırakılamaz.";
    }
    return "";
  };
  
  // Check if form is valid
  const isFormValid = () => {
    return (
      ventilation.trim().length > 0 &&
      irrigation.trim().length > 0 &&
      fertilization.trim().length > 0
    );
  };
  
  // Handle field change with validation
  const handleFieldChange = (name: "ventilation" | "irrigation" | "fertilization", value: string) => {
    if (name === "ventilation") {
      setVentilation(value);
    } else if (name === "irrigation") {
      setIrrigation(value);
    } else if (name === "fertilization") {
      setFertilization(value);
    }
    
    // Clear error when user starts typing
    if (touched[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: validateField(name, value),
      }));
    }
  };
  
  // Handle field blur (mark as touched and validate)
  const handleFieldBlur = (name: "ventilation" | "irrigation" | "fertilization") => {
    setTouched(prev => ({
      ...prev,
      [name]: true,
    }));
    
    const value = name === "ventilation" ? ventilation : name === "irrigation" ? irrigation : fertilization;
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, value),
    }));
  };

  const handleSubmit = async () => {
    if (isLoading || !isFormValid()) return;
    
    // Mark all fields as touched to show errors
    setTouched({
      ventilation: true,
      irrigation: true,
      fertilization: true,
    });
    
    // Validate all fields
    const newErrors = {
      ventilation: validateField("ventilation", ventilation),
      irrigation: validateField("irrigation", irrigation),
      fertilization: validateField("fertilization", fertilization),
    };
    
    setErrors(newErrors);
    
    // If there are errors, don't submit
    if (newErrors.ventilation || newErrors.irrigation || newErrors.fertilization) {
      return;
    }

    try {
      setIsLoading(true);

      // Create prescription directly as PENDING (no draft)
      await createPrescription(campusId, {
        ventilation: ventilation.trim(),
        irrigation: irrigation.trim(),
        fertilization: fertilization.trim(),
      });

      toast({
        title: "Reçete gönderildi",
        description: "Reçete denetçi onayı için gönderildi.",
        duration: 2500,
      });

      onSaved();
      onClose();
    } catch (error: any) {
      console.error("Submit prescription error:", error);
      toast({
        title: "Hata",
        description: error.message || "Reçete gönderilirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    // Just close modal, no API call (no record created yet)
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Yeni Reçete Yaz - {campusName}
          </DialogTitle>
          <DialogDescription>
            Reçete bilgilerini doldurun ve gönderin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="ventilation">Havalandırma</Label>
            <Textarea
              id="ventilation"
              value={ventilation}
              onChange={(e) => handleFieldChange("ventilation", e.target.value)}
              onBlur={() => handleFieldBlur("ventilation")}
              placeholder="Havalandırma önerilerini buraya yazın..."
              rows={4}
              disabled={isLoading}
              className={`resize-none ${errors.ventilation && touched.ventilation ? "border-destructive" : ""}`}
            />
            {errors.ventilation && touched.ventilation && (
              <p className="text-sm text-destructive">{errors.ventilation}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="irrigation">Sulama</Label>
            <Textarea
              id="irrigation"
              value={irrigation}
              onChange={(e) => handleFieldChange("irrigation", e.target.value)}
              onBlur={() => handleFieldBlur("irrigation")}
              placeholder="Sulama önerilerini buraya yazın..."
              rows={4}
              disabled={isLoading}
              className={`resize-none ${errors.irrigation && touched.irrigation ? "border-destructive" : ""}`}
            />
            {errors.irrigation && touched.irrigation && (
              <p className="text-sm text-destructive">{errors.irrigation}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fertilization">Gübreleme</Label>
            <Textarea
              id="fertilization"
              value={fertilization}
              onChange={(e) => handleFieldChange("fertilization", e.target.value)}
              onBlur={() => handleFieldBlur("fertilization")}
              placeholder="Gübreleme önerilerini buraya yazın..."
              rows={4}
              disabled={isLoading}
              className={`resize-none ${errors.fertilization && touched.fertilization ? "border-destructive" : ""}`}
            />
            {errors.fertilization && touched.fertilization && (
              <p className="text-sm text-destructive">{errors.fertilization}</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={handleDelete}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={18} />
            <span>Sil</span>
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || !isFormValid()}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={18} />
            <span>{isLoading ? "Gönderiliyor..." : "Gönder"}</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrescriptionFormModal;
