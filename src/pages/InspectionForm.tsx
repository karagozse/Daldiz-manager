import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useApp, INSPECTION_TOPICS, TopicInspection, InspectionCycle, TopicStatus, CriticalWarning, InspectionState, BackendInspection } from "@/contexts/AppContext";
import HeaderWithBack from "@/components/HeaderWithBack";
import CriticalWarningsModal from "@/components/CriticalWarningsModal";
import CriticalWarningCard from "@/components/CriticalWarningCard";
import { PhotoThumbnail } from "@/components/PhotoThumbnail";
import { getPhotoUrl } from "@/lib/photoUtils";
import { apiBaseUrl } from "@/config/env";
import { fetchCriticalWarningsForGarden } from "@/lib/criticalWarnings";
import { compressImageToJpeg } from "@/lib/imageUtils";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";
import { CheckCircle2, Circle, Camera, ChevronRight, Save, Send, X, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const statusOptions: { value: TopicStatus; label: string; className: string }[] = [
  { value: "uygun", label: "Uygun", className: "bg-success/10 text-success border-success/30" },
  { value: "kismen_uygun", label: "Kısmen Uygun", className: "bg-warning/20 text-warning-foreground border-warning/30" },
  { value: "uygun_degil", label: "Uygun Değil", className: "bg-destructive/10 text-destructive border-destructive/30" },
];

const InspectionForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const gardenId = parseInt(id || "1");
  
  // Back handler - show exit confirmation dialog only if there are unsaved changes
  const handleBack = () => {
    // Only show exit confirmation dialog if there are unsaved changes
    if (hasUnsavedChanges) {
      setIsExitDialogOpen(true);
    } else {
      // No unsaved changes - navigate back directly
      navigate(`/bahce/${gardenId}`);
    }
  };
  
  // Handle confirm exit - delete inspection and navigate back
  const handleConfirmExit = async () => {
    if (isDeleting || isSavingDraft || isSubmitting) return;

    try {
      setIsDeleting(true);

      // If there's a backend draft, delete it from backend
      if (backendDraft) {
        await deleteInspection(backendDraft.id);
        // Reload inspections to refresh state
        await loadInspectionsForGarden(gardenId);
        toast({
          title: "İptal edildi",
          description: "Değişiklikler kaydedilmedi.",
          duration: 2500,
        });
      } else {
        // No draft exists - just navigate back
        toast({
          title: "İptal edildi",
          description: "Değişiklikler kaydedilmedi.",
          duration: 2500,
        });
      }

      // Clear unsaved changes flag (user is intentionally discarding changes)
      setHasUnsavedChanges(false);
      
      // Close dialog and navigate back
      setIsExitDialogOpen(false);
      setIsDeleting(false);
      navigate(`/bahce/${gardenId}`);
    } catch (error) {
      console.error("Exit inspection error:", error);
      toast({
        title: "Hata",
        description: "Denetimden çıkılırken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
      setIsDeleting(false);
    }
  };
  const { 
    activeRole,
    gardens, 
    inspectionCycles,
    setInspectionCycles,
    getCompletedCyclesForGarden,
    findDraftForGarden,
    inspections,
    updateInspection,
    createInspection,
    deleteInspection,
    loadInspectionsForGarden,
    currentUser
  } = useApp();
  
  // Critical warnings modal state
  const [isWarningsModalOpen, setIsWarningsModalOpen] = useState(false);
  const [viewingTopicId, setViewingTopicId] = useState<number | undefined>(undefined);
  
  // State for critical warnings - loaded for displaying in topic dialog
  const [warnings, setWarnings] = useState<CriticalWarning[]>([]);
  
  const garden = gardens.find(g => g.id === gardenId);
  
  // State for completed cycles - loaded in useMemo to avoid render-time context calls
  const completedCycles = useMemo(() => {
    return getCompletedCyclesForGarden(gardenId);
  }, [gardenId, getCompletedCyclesForGarden]);
  
  // Initialize topics with FRESH state - will be updated in useEffect when draft loads
  const [topics, setTopics] = useState<TopicInspection[]>(() => {
    // Always start with fresh topics - draft will be loaded in useEffect
    return INSPECTION_TOPICS.map(t => ({
      topicId: t.id,
      topicName: t.name,
      status: "not_started" as TopicStatus,
      note: "",
    }));
  });
  
  // State for draft inspection - loaded in useEffect to avoid render-time state updates
  const [backendDraft, setBackendDraft] = useState<BackendInspection | null>(null);
  const [existingDraft, setExistingDraft] = useState<InspectionCycle | null>(null);
  
  const [selectedTopic, setSelectedTopic] = useState<TopicInspection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [topicNote, setTopicNote] = useState("");
  const [topicStatus, setTopicStatus] = useState<TopicStatus>("not_started");
  
  // File input ref for photo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Photo viewer state
  const [photoViewerUrl, setPhotoViewerUrl] = useState<string | null>(null);
  
  // Loading states for save/submit operations
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Exit confirmation dialog state
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  
  // Track if form has unsaved changes (for preventing navigation without save)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDraftSaved, setIsDraftSaved] = useState(false);

  
  // Backend'den inspections yükle
  useEffect(() => {
    if (gardenId) {
      loadInspectionsForGarden(gardenId);
    }
  }, [gardenId, loadInspectionsForGarden]);

  // Load critical warnings for the garden (for displaying in topic dialog)
  useEffect(() => {
    const loadWarnings = async () => {
      if (!gardenId) return;

      try {
        const backendWarnings = await fetchCriticalWarningsForGarden(gardenId, "OPEN");
        setWarnings(backendWarnings);
      } catch (error) {
        console.error("Failed to load critical warnings for garden", error);
        setWarnings([]);
      }
    };

    loadWarnings();
  }, [gardenId]);

  
  // Load draft inspection in useEffect (not during render)
  useEffect(() => {
    if (!gardenId) return;
    
    // Find backend draft (pure lookup - no state updates)
    const foundBackendDraft = inspections
      .filter(i => {
        if (i.gardenId !== gardenId || i.status !== "DRAFT") return false;
        // If we have current user ID, only show their drafts
        if (currentUser?.id) {
          return i.createdById === currentUser.id;
        }
        // Otherwise show all drafts (for backward compatibility)
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    // Find mock draft (pure lookup - no state updates)
    const foundMockDraft = findDraftForGarden(gardenId);
    
    // Update state in useEffect (safe - not during render)
    if (foundBackendDraft) {
      setBackendDraft(foundBackendDraft);
      
      // Convert backend draft to InspectionCycle format
      if (foundBackendDraft.topics) {
        const draftCycle: InspectionCycle = {
          id: foundBackendDraft.id,
          gardenId: foundBackendDraft.gardenId,
          state: "DRAFT" as InspectionState,
          topics: foundBackendDraft.topics.map(t => ({
            topicId: t.topicId,
            topicName: t.topicName,
            status: t.status || "not_started", // Ensure status is always valid TopicStatus
            note: t.note || "",
            photoUrl: t.photoUrl || undefined,
            score: t.score || undefined,
          })),
          criticalWarnings: [],
        };
        setExistingDraft(draftCycle);
      }
    } else if (foundMockDraft) {
      setBackendDraft(null);
      setExistingDraft(foundMockDraft);
    } else {
      setBackendDraft(null);
      setExistingDraft(null);
    }
  }, [gardenId, inspections, inspectionCycles, currentUser?.id, findDraftForGarden]);
  
  // Load existing draft topics from draft when found
  // NOTE: This only LOADS data from backend, it does NOT save anything.
  // Saving only happens when user presses bottom "Kaydet" or "Gönder" buttons.
  useEffect(() => {
    if (existingDraft && existingDraft.topics && existingDraft.topics.length > 0) {
      // Load topics from draft into local state
      const draftTopics = existingDraft.topics.map(t => ({
        topicId: t.topicId,
        topicName: t.topicName,
        status: t.status || "not_started",
        note: t.note || "",
        photoUrl: t.photoUrl || undefined,
        score: t.score ?? undefined,
      }));
      
      // Merge draft topics with INSPECTION_TOPICS to ensure all topics exist
      // This ensures we have all topics even if the draft doesn't have all of them
      const mergedTopics = INSPECTION_TOPICS.map(topic => {
        const draftTopic = draftTopics.find(dt => dt.topicId === topic.id);
        if (draftTopic) {
          return draftTopic;
        }
        // If not in draft, create empty topic
        return {
          topicId: topic.id,
          topicName: topic.name,
          status: "not_started" as TopicStatus,
          note: "",
        };
      });
      
      // Always update topics when draft changes
      setTopics(mergedTopics);
      
      // Mark draft as loaded (saved state)
      setIsDraftSaved(true);
      setHasUnsavedChanges(false);
    } else if (!existingDraft) {
      // If no draft exists, reset to fresh topics
      setTopics(INSPECTION_TOPICS.map(t => ({
        topicId: t.id,
        topicName: t.name,
        status: "not_started" as TopicStatus,
        note: "",
      })));
      
      // No draft - not saved yet
      setIsDraftSaved(false);
      setHasUnsavedChanges(false);
    }
  }, [existingDraft]); // REMOVED 'topics' from dependency array to prevent infinite loop
  

  const role = mapBackendRoleToSemantic(activeRole ?? "");
  const canStartInspection = can.seeStartAuditBtn(role);

  if (!canStartInspection) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <p className="text-muted-foreground text-center">
          Bu sayfaya erişim yetkiniz yok. Denetim başlatmak için danışman veya root olarak giriş yapmalısınız.
        </p>
      </div>
    );
  }

  if (!garden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Bahçe bulunamadı</p>
      </div>
    );
  }

  const handleTopicClick = (topic: TopicInspection) => {
    setSelectedTopic(topic);
    setTopicNote(topic.note || "");
    // Ensure status defaults to "not_started" if undefined/null
    setTopicStatus(topic.status || "not_started");
    setIsDialogOpen(true);
  };

  // Get warnings for a specific topic (for displaying in topic dialog)
  const getTopicWarnings = (topicId: number): CriticalWarning[] => {
    return warnings.filter(w => w.topicId === topicId);
  };

  // Handle photo file selection and upload
  // IMPORTANT: This ONLY uploads the file to get a URL. It does NOT persist the inspection.
  // The photo URL is stored in local state and will be saved when user presses "Kaydet" or "Gönder".
  const handlePhotoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTopic) {
      return;
    }

    try {
      setIsUploadingPhoto(true);

      // We need a temporary inspectionId to upload the photo file.
      // If we have a backend draft, use its ID; otherwise create a minimal temporary one.
      // NOTE: This temporary draft will be replaced/updated when user presses "Kaydet" or "Gönder".
      let inspectionId = backendDraft?.id;
      
      if (!inspectionId) {
        // Create a minimal temporary draft just for photo upload (not persisted until user saves)
        const topicsPayload = topics.map(t => ({
          topicId: t.topicId,
          topicName: t.topicName,
          status: t.status,
          note: t.note || null,
          photoUrl: t.photoUrl || null,
          score: t.score ?? null,
        }));

        const newDraft = await createInspection(gardenId, {
          status: "DRAFT",
          topics: topicsPayload,
        });
        
        inspectionId = newDraft.id;
        setBackendDraft(newDraft);
        
        // Reload inspections to update state
        await loadInspectionsForGarden(gardenId);
      }

      // Compress and convert image to JPEG on client (max 1600x1600, quality 0.8)
      // This handles HEIC/HEIF from mobile devices by converting them to JPEG
      const compressedFile = await compressImageToJpeg(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        quality: 0.8,
      });

      // Create FormData with compressed JPEG file
      const formData = new FormData();
      formData.append("file", compressedFile);

      // Upload to backend - use fetch directly to avoid Content-Type header override
      // Use centralized apiBaseUrl which automatically resolves based on hostname
      const token = localStorage.getItem('accessToken');
      const uploadResponse = await fetch(
        `${apiBaseUrl}/uploads/inspection-photo/${inspectionId}/${selectedTopic.topicId}`,
        {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Don't set Content-Type - browser will set it with boundary for FormData
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        let errorMessage = `Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const response = await uploadResponse.json() as { url: string };

      // Update topic state with photoUrl (local state only - not persisted until user saves)
      setTopics((prev) =>
        prev.map((t) =>
          t.topicId === selectedTopic.topicId
            ? { ...t, photoUrl: response.url }
            : t
        )
      );

      // Also update selectedTopic for immediate UI feedback
      setSelectedTopic((prev) =>
        prev ? { ...prev, photoUrl: response.url } : null
      );

      // Mark that form has unsaved changes (photo was added)
      setHasUnsavedChanges(true);
      
      toast({
        title: "Fotoğraf yüklendi",
        description: "Fotoğraf kaydedildi. Formu kaydetmek için 'Kaydet' veya 'Gönder' butonunu kullanın.",
        duration: 2500,
      });
    } catch (error) {
      console.error("Photo upload error:", error);
      toast({
        title: "Hata",
        description: "Fotoğraf yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingPhoto(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Trigger file input when "Fotoğraf Ekle" is clicked
  const handlePhotoButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Handle photo deletion
  // IMPORTANT: This ONLY updates local state. The photo removal will be persisted when user presses "Kaydet" or "Gönder".
  const handleDeletePhoto = () => {
    if (!selectedTopic || !selectedTopic.photoUrl) {
      return;
    }

    // Only update local state - do NOT call backend API
    // The photo will be removed from backend when user saves the form
    setTopics((prev) =>
      prev.map((t) =>
        t.topicId === selectedTopic.topicId
          ? { ...t, photoUrl: undefined }
          : t
      )
    );

    // Also update selectedTopic for immediate UI feedback
    setSelectedTopic((prev) =>
      prev ? { ...prev, photoUrl: undefined } : null
    );

    // Mark that form has unsaved changes (photo was deleted)
    setHasUnsavedChanges(true);
    
    toast({
      title: "Fotoğraf silindi",
      description: "Fotoğraf kaldırıldı. Değişiklikleri kaydetmek için 'Kaydet' veya 'Gönder' butonunu kullanın.",
      duration: 2500,
    });
  };

  /**
   * Handle saving a topic from the dialog.
   * IMPORTANT: This ONLY updates local state. It does NOT persist to backend.
   * Backend persistence only happens when user presses the bottom "Kaydet" or "Gönder" buttons.
   * 
   * Requires: topicStatus must be selected (not "not_started")
   */
  const handleSaveTopic = () => {
    // Validate: Status must be selected (not "not_started")
    if (topicStatus === "not_started") {
      toast({
        title: "Durum seçilmedi",
        description: "Lütfen bir uygunluk durumu seçin.",
        variant: "destructive",
      });
      return;
    }

    if (selectedTopic) {
      // Only update local topics state - no backend API calls
      // Include status, note, and photoUrl from selectedTopic
      setTopics(prev => prev.map(t => {
        if (t.topicId === selectedTopic.topicId) {
          return {
            ...t,
            note: topicNote.trim() || "",
            status: topicStatus, // Use selected status directly
            photoUrl: selectedTopic.photoUrl || t.photoUrl, // Preserve photoUrl from selectedTopic or keep existing
          };
        }
        return t;
      }));
      
      // Mark that form has unsaved changes
      setHasUnsavedChanges(true);
      
      // Close dialog and reset selection
      setIsDialogOpen(false);
      setSelectedTopic(null);
    }
  };

  /**
   * Save current form state as DRAFT to backend.
   * This is the ONLY function that persists DRAFT inspections to the database.
   * Called only by the bottom "Kaydet" button.
   * 
   * Validation: At least 1 topic must have a status selected (for draft, not all topics required)
   */
  const saveAsDraft = async () => {
    if (isSubmitting || isSavingDraft) return; // Prevent conflicts
    
    // Validate: At least 1 topic must have a status (for draft)
    const hasAtLeastOneTopic = topics.some(t => 
      t.status === "uygun" || t.status === "kismen_uygun" || t.status === "uygun_degil"
    );
    
    if (!hasAtLeastOneTopic) {
      toast({
        title: "Eksik konu",
        description: "En az bir konu için durum seçilmeden form kaydedilemez.",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }
    
    try {
      setIsSavingDraft(true);
      
      const payload = {
        status: "DRAFT" as const,
        topics: topics.map(t => ({
          topicId: t.topicId,
          topicName: t.topicName,
          status: t.status,
          note: t.note || null,
          photoUrl: t.photoUrl || null,
          score: t.score ?? null,
        })),
      };

      // Check if there's an existing DRAFT for this consultant and garden
      if (backendDraft) {
        // Update existing draft
        await updateInspection(backendDraft.id, payload);
      } else {
        // Create new draft (no existing draft found)
        await createInspection(gardenId, payload);
      }

      // Reload inspections to get updated state
      await loadInspectionsForGarden(gardenId);

      toast({
        title: "Taslak kaydedildi",
        description: "Denetim taslağı başarıyla kaydedildi.",
      });
      
      // Mark draft as saved and clear unsaved changes flag
      // User stays on the form after saving - do not navigate or show exit modal
      setIsDraftSaved(true);
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("saveAsDraft error", e);
      toast({
        title: "Hata",
        description: "Taslak kaydedilirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const submitForReview = async () => {
    if (isSavingDraft || isSubmitting) return; // Prevent conflicts
    
    // Validate: All topics must have a status
    if (!allTopicsHaveStatus(topics)) {
      toast({
        title: "Eksik konular var",
        description: "Tüm denetim konuları için durum seçilmeden form kaydedilemez.",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Build topics payload from current topics state
      const topicsPayload = topics.map(t => ({
        topicId: t.topicId,
        topicName: t.topicName,
        status: t.status,
        note: t.note || null,
        photoUrl: t.photoUrl || null,
        score: t.score ?? null,
      }));

      if (backendDraft) {
        // There is already a DRAFT for this consultant+garden
        await updateInspection(backendDraft.id, {
          status: "SUBMITTED",
          topics: topicsPayload,
        });
      } else {
        // No draft yet: create a brand new inspection as SUBMITTED
        await createInspection(gardenId, {
          status: "SUBMITTED",
          topics: topicsPayload,
        });
      }

      // Reload inspections to get updated state
      await loadInspectionsForGarden(gardenId);
      
      toast({
        title: "Denetim gönderildi",
        description: "Denetim değerlendirme için gönderildi.",
      });
      
      // Clear unsaved changes flag and navigate back to garden detail directly
      setHasUnsavedChanges(false);
      navigate(`/bahce/${gardenId}`);
    } catch (e) {
      console.error("submitForReview backend error:", e);
      toast({
        title: "Hata",
        description: "Denetim gönderilirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsSubmitting(false);
    }
  };


  // Helper function to check if all topics have a valid status
  const allTopicsHaveStatus = (topics: TopicInspection[]): boolean => {
    return topics.every(t => t.status === "uygun" || t.status === "kismen_uygun" || t.status === "uygun_degil");
  };

  // Handle delete inspection
  const handleDeleteInspection = async () => {
    if (isDeleting || isSavingDraft || isSubmitting) return;

    try {
      setIsDeleting(true);

      // If there's a backend draft, delete it from backend
      if (backendDraft) {
        await deleteInspection(backendDraft.id);
        // Reload inspections to refresh state
        await loadInspectionsForGarden(gardenId);
        toast({
          title: "Denetim silindi",
          description: "Denetim başarıyla silindi.",
          duration: 2500,
        });
      } else {
        // No draft exists - just reset local state and navigate back
        // Unsaved changes are discarded by navigation
        toast({
          title: "İptal edildi",
          description: "Değişiklikler kaydedilmedi.",
        });
      }

      // Clear unsaved changes flag and close dialog
      setHasUnsavedChanges(false);
      setIsDeleteDialogOpen(false);
      
      // Navigate back to garden detail directly (no need to show exit dialog)
      navigate(`/bahce/${gardenId}`);
    } catch (error) {
      console.error("Delete inspection error:", error);
      toast({
        title: "Hata",
        description: "Denetim silinirken bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const completedCount = topics.filter(t => t.status !== "not_started").length;
  
  // Validation: Can save draft if at least 1 topic has status, can submit if all topics have status
  const hasAtLeastOneTopic = topics.some(t => 
    t.status === "uygun" || t.status === "kismen_uygun" || t.status === "uygun_degil"
  );
  const canSaveDraft = hasAtLeastOneTopic && !isSavingDraft && !isSubmitting && !isDeleting;
  const canSubmit = allTopicsHaveStatus(topics) && !isSavingDraft && !isSubmitting && !isDeleting;
  const hasIncompleteTopics = !allTopicsHaveStatus(topics);

  const getStatusIcon = (status: TopicStatus) => {
    if (status !== "not_started") {
      return <CheckCircle2 size={20} className="text-success flex-shrink-0" />;
    }
    return <Circle size={20} className="text-muted-foreground flex-shrink-0" />;
  };

  const getStatusLabel = (status: TopicStatus) => {
    const option = statusOptions.find(o => o.value === status);
    return option?.label || "Bekliyor";
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <HeaderWithBack 
        title="Denetim Formu" 
        subtitle={garden.name}
        onBack={handleBack}
      />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Progress */}
        <div className="card-elevated p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">İlerleme</span>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{topics.length}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(completedCount / topics.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Topic List */}
        <div className="space-y-3">
          {topics.map((topic) => (
            <button
              key={topic.topicId}
              onClick={() => handleTopicClick(topic)}
              className="w-full card-elevated p-4 flex items-center gap-3 text-left hover:shadow-md transition-shadow"
              aria-label={`${topic.topicName} konusunu ${topic.status === "not_started" ? "başlat" : "düzenle"}`}
            >
              {getStatusIcon(topic.status)}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-foreground truncate">{topic.topicName}</h4>
                  <div className="flex items-center gap-2">
                    {topic.status !== "not_started" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${
                        statusOptions.find(o => o.value === topic.status)?.className || ''
                      }`}>
                        {getStatusLabel(topic.status)}
                      </span>
                    )}
                  </div>
                </div>
                {topic.note && (
                  <p className="text-sm text-muted-foreground truncate mt-1">{topic.note}</p>
                )}
              </div>
              
              <ChevronRight size={20} className="text-muted-foreground flex-shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4">
        <div className="max-w-lg mx-auto space-y-2">
          {hasIncompleteTopics && (
            <p className="text-xs text-muted-foreground text-center">
              Göndermek için tüm konular için durum seçilmiş olmalıdır.
            </p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isDeleting || isSavingDraft || isSubmitting}
              className="flex items-center justify-center gap-2 px-4 py-3 border border-destructive/30 bg-destructive/10 text-destructive rounded-xl font-medium hover:bg-destructive/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={18} />
              <span>{isDeleting ? "Siliniyor..." : "Sil"}</span>
            </button>
            <button
              onClick={saveAsDraft}
              disabled={!canSaveDraft}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-border rounded-xl font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              <span>{isSavingDraft ? "Kaydediliyor..." : "Kaydet"}</span>
            </button>
            <button
              onClick={submitForReview}
              disabled={!canSubmit}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              <span>{isSubmitting ? "Gönderiliyor..." : "Gönder"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Dialog */}
      <Dialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kaydetmeden çıkmak üzeresiniz</DialogTitle>
            <DialogDescription>
              Formu kaydetmeden çıkmak istediğinizden emin misiniz? Yapılan tüm değişiklikler ve yüklenen fotoğraflar silinecek.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsExitDialogOpen(false)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vazgeç
            </button>
            <button
              onClick={handleConfirmExit}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Çıkılıyor..." : "Çık"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Denetimi sil</DialogTitle>
            <DialogDescription>
              Bu denetimi silmek istediğinize emin misiniz? Tüm notlar ve fotoğraflar silinecek.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 border border-border rounded-lg font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Vazgeç
            </button>
            <button
              onClick={handleDeleteInspection}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? "Siliniyor..." : "Evet, sil"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Topic Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTopic?.topicName}</DialogTitle>
            <DialogDescription className="sr-only">
              Bu pencerede bu denetim konusu için gözlemlerinizi ve durumu giriyorsunuz.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {/* Status Selection */}
            <div>
              <label htmlFor="topicStatus" className="text-sm font-medium text-foreground mb-2 block">
                Durum
              </label>
              <div className="flex gap-2" role="radiogroup" aria-labelledby="topicStatus">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTopicStatus(option.value)}
                    className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border transition-colors ${
                      topicStatus === option.value
                        ? option.className
                        : 'border-border text-muted-foreground hover:border-foreground/30'
                    }`}
                    aria-pressed={topicStatus === option.value}
                    aria-label={`Durum: ${option.label}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label htmlFor="topicNote" className="text-sm font-medium text-foreground mb-2 block">
                Not
              </label>
              <Textarea
                id="topicNote"
                value={topicNote}
                onChange={(e) => setTopicNote(e.target.value)}
                placeholder="Gözlemlerinizi yazın..."
                rows={4}
              />
            </div>
            
            {/* Photo Section */}
            <div className="mt-4">
              <label className="block text-xs text-muted-foreground mb-2">
                Fotoğraf
              </label>
              <PhotoThumbnail
                photoPath={selectedTopic?.photoUrl}
                onView={() => setPhotoViewerUrl(selectedTopic?.photoUrl ?? null)}
                onChange={isUploadingPhoto ? undefined : handlePhotoButtonClick}
                onDelete={isUploadingPhoto ? undefined : handleDeletePhoto}
                size="md"
              />
              
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoFileChange}
                disabled={isUploadingPhoto}
              />
              
              {isUploadingPhoto && (
                <p className="mt-2 text-xs text-muted-foreground">Yükleniyor...</p>
              )}
            </div>

            {/* Critical Warnings - Read-only list */}
            {selectedTopic && (() => {
              const topicWarnings = getTopicWarnings(selectedTopic.topicId);
              if (topicWarnings.length === 0) return null;
              
              return (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Kritik Uyarılar</p>
                  <div className="space-y-3">
                    {topicWarnings.map(warning => (
                      <CriticalWarningCard
                        key={warning.id}
                        id={warning.id}
                        title={warning.title}
                        description={warning.description}
                        status={warning.status}
                        topicId={warning.topicId}
                        openedDate={warning.openedDate}
                        closedDate={warning.closedDate}
                        closureNote={warning.closureNote}
                        gardenId={gardenId}
                        gardenName={garden?.name}
                        campusName={garden?.campusName}
                        mode="evaluation"
                        showActions={false}
                      />
                    ))}
                  </div>
                </div>
              );
            })()}
            
            <button
              onClick={handleSaveTopic}
              disabled={topicStatus === "not_started"}
              className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Kaydet
            </button>
          </div>
        </DialogContent>
        </Dialog>

      {/* Photo viewer modal */}
      <Dialog
        open={!!photoViewerUrl}
        onOpenChange={(open) => {
          if (!open) {
            setPhotoViewerUrl(null);
          }
        }}
      >
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto h-auto border-none bg-transparent shadow-none p-0 flex items-center justify-center">
          <DialogTitle className="sr-only">Denetim fotoğrafı</DialogTitle>
          <DialogDescription className="sr-only">
            Denetim fotoğrafını büyük olarak görüntülüyorsunuz.
          </DialogDescription>
          {photoViewerUrl && (
            <div className="relative max-w-[90vw] max-h-[90vh] w-auto h-auto flex items-center justify-center">
              {/* Close button */}
              <button
                type="button"
                className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-md hover:bg-white transition-colors"
                onClick={() => setPhotoViewerUrl(null)}
                aria-label="Kapat"
              >
                <X className="h-5 w-5" />
              </button>
              <img
                src={getPhotoUrl(photoViewerUrl) ?? ""}
                alt="Denetim fotoğrafı"
                className="max-h-[90vh] max-w-[90vw] w-auto h-auto object-contain rounded-xl"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Critical Warnings Modal */}
      {garden && (
        <CriticalWarningsModal
          isOpen={isWarningsModalOpen}
          onClose={() => setIsWarningsModalOpen(false)}
          title={viewingTopicId 
            ? `${INSPECTION_TOPICS.find(t => t.id === viewingTopicId)?.name || "Bilinmeyen"} konusu için açık kritik uyarılar`
            : "Açık Kritik Uyarılar"}
          gardenId={garden.id}
          status="OPEN"
          topicId={viewingTopicId}
        />
      )}

    </div>
  );
};

export default InspectionForm;
