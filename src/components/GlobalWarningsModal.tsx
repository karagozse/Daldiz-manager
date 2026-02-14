import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { useApp, CriticalWarning, INSPECTION_TOPICS } from "@/contexts/AppContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CriticalWarningCard from "@/components/CriticalWarningCard";
import { fetchGlobalCriticalWarnings, CriticalWarningFilters } from "@/lib/criticalWarnings";

interface GlobalWarningsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCampusId?: string; // Optional - pre-select campus filter when modal opens
}

const GlobalWarningsModal = ({ 
  isOpen, 
  onClose,
  initialCampusId,
}: GlobalWarningsModalProps) => {
  const navigate = useNavigate();
  const { gardens, setSelectedGardenId } = useApp();
  
  // Filter state - default to OPEN only
  const [statusFilter, setStatusFilter] = useState<"all" | "OPEN" | "CLOSED">("OPEN");
  const [campusFilter, setCampusFilter] = useState<string>("all");
  const [topicFilter, setTopicFilter] = useState<string>("all");

  // Set initial campus filter when modal opens with initialCampusId
  useEffect(() => {
    if (isOpen && initialCampusId) {
      setCampusFilter(initialCampusId);
    } else if (isOpen && !initialCampusId) {
      // Reset to "all" when opening without initial filter
      setCampusFilter("all");
    }
  }, [isOpen, initialCampusId]);
  
  // Warnings state
  const [warnings, setWarnings] = useState<CriticalWarning[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch warnings when modal opens or filters change
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const filters: CriticalWarningFilters = {
        status: statusFilter,
        campusId: campusFilter !== "all" ? campusFilter : undefined,
        topicId: topicFilter !== "all" ? parseInt(topicFilter) : undefined,
        limit: 100,
        offset: 0,
      };
      
      fetchGlobalCriticalWarnings(filters)
        .then((fetchedWarnings) => {
          setWarnings(fetchedWarnings);
        })
        .catch((error) => {
          console.error("Error fetching global critical warnings:", error);
          setWarnings([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setWarnings([]);
    }
  }, [isOpen, statusFilter, campusFilter, topicFilter]);

  const handleNavigateToGarden = (gardenId: number) => {
    onClose();
    setSelectedGardenId(gardenId);
    navigate(`/bahce/${gardenId}`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md mx-auto max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="sticky top-0 bg-background z-10 p-4 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Bell size={20} className="text-destructive" />
              <span>Kritik Uyarılar</span>
            </DialogTitle>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted rounded-full transition-colors"
              aria-label="Kapat"
              title="Kapat"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
          <DialogDescription className="sr-only">
            Bahçeler için global kritik uyarıları filtreleyip listeleyebileceğiniz pencere.
          </DialogDescription>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Yükleniyor..." : `${warnings.length} sonuç`}
          </p>
        </DialogHeader>
        
        {/* Filters */}
        <div className="flex gap-2 p-4 pb-2 overflow-x-auto shrink-0 border-b">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-24 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="OPEN">Açık</SelectItem>
              <SelectItem value="CLOSED">Kapalı</SelectItem>
            </SelectContent>
          </Select>

          <Select value={campusFilter} onValueChange={setCampusFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue placeholder="Kampüs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Kampüs</SelectItem>
              <SelectItem value="belek">Belek</SelectItem>
              <SelectItem value="candir">Çandır</SelectItem>
              <SelectItem value="manavgat">Manavgat</SelectItem>
            </SelectContent>
          </Select>

          <Select value={topicFilter} onValueChange={setTopicFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Konu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Konular</SelectItem>
              {INSPECTION_TOPICS.map(topic => (
                <SelectItem key={topic.id} value={topic.id.toString()}>
                  {topic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Yükleniyor...</p>
            </div>
          ) : warnings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell size={32} className="mx-auto mb-2 opacity-50 text-destructive" />
              <p>Kritik uyarı bulunmuyor</p>
            </div>
          ) : (
            warnings.map((warning) => (
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
                gardenId={typeof warning.gardenId === "string" ? parseInt(warning.gardenId) : warning.gardenId}
                gardenName={warning.gardenName}
                campusName={warning.campusName}
                onNavigateToGarden={() => handleNavigateToGarden(typeof warning.gardenId === "string" ? parseInt(warning.gardenId) : (warning.gardenId ?? 0))}
              />
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalWarningsModal;