import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Leaf } from "lucide-react";
import { useApp, Garden } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";

interface GardenManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CAMPUSES = [
  { id: "belek", name: "Belek Kampüsü" },
  { id: "candir", name: "Çandır Kampüsü" },
  { id: "manavgat", name: "Manavgat Kampüsü" },
];

const GardenManagementModal = ({ isOpen, onClose }: GardenManagementModalProps) => {
  const { gardens, addGarden, toggleGardenStatus } = useApp();
  const { toast } = useToast();
  
  const [newGardenName, setNewGardenName] = useState("");
  const [selectedCampus, setSelectedCampus] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateGarden = () => {
    if (!newGardenName.trim()) {
      toast({ title: "Bahçe adı giriniz", variant: "destructive", duration: 4500 });
      return;
    }
    if (!selectedCampus) {
      toast({ title: "Kampüs seçiniz", variant: "destructive", duration: 4500 });
      return;
    }

    const campus = CAMPUSES.find(c => c.id === selectedCampus);
    if (!campus) return;

    addGarden(newGardenName.trim(), selectedCampus, campus.name);
    toast({ title: `"${newGardenName}" bahçesi oluşturuldu`, duration: 2500 });
    setNewGardenName("");
    setSelectedCampus("");
    setIsCreating(false);
  };

  const handleToggleStatus = (gardenId: number, currentStatus: boolean) => {
    toggleGardenStatus(gardenId);
    toast({
      title: currentStatus ? "Bahçe pasif yapıldı" : "Bahçe aktif yapıldı",
      duration: 2500,
    });
  };

  // Group gardens by campus
  const gardensByCampus = CAMPUSES.map(campus => ({
    ...campus,
    gardens: gardens.filter(g => g.campusId === campus.id),
  }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Leaf size={20} className="text-primary" />
            Bahçe Yönetimi
          </DialogTitle>
          <DialogDescription className="sr-only">
            Bahçeleri yönetip ekleyebileceğiniz veya durumlarını değiştirebileceğiniz pencere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Create Garden Section */}
          {!isCreating ? (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setIsCreating(true)}
            >
              <Plus size={18} />
              Yeni Bahçe Ekle
            </Button>
          ) : (
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Yeni Bahçe Oluştur</p>
              
              <div>
                <label htmlFor="gardenCampus" className="text-sm font-medium text-foreground mb-2 block">
                  Kampüs
                </label>
                <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                  <SelectTrigger id="gardenCampus">
                    <SelectValue placeholder="Kampüs seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {CAMPUSES.map(campus => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="gardenName" className="text-sm font-medium text-foreground mb-2 block">
                  Bahçe Adı
                </label>
                <Input
                  id="gardenName"
                  placeholder="Bahçe adı"
                  value={newGardenName}
                  onChange={(e) => setNewGardenName(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setIsCreating(false);
                    setNewGardenName("");
                    setSelectedCampus("");
                  }}
                >
                  İptal
                </Button>
                <Button className="flex-1" onClick={handleCreateGarden}>
                  Oluştur
                </Button>
              </div>
            </div>
          )}

          {/* Gardens List */}
          <ScrollArea className="h-[400px] pr-2">
            <div className="space-y-4">
              {gardensByCampus.map(campus => (
                <div key={campus.id}>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {campus.name} ({campus.gardens.length} bahçe)
                  </p>
                  <div className="space-y-2">
                    {campus.gardens.map(garden => {
                      const isActive = garden.status !== "INACTIVE";
                      return (
                        <div
                          key={garden.id}
                          className={`flex items-center justify-between p-3 rounded-xl border ${
                            isActive ? "border-border bg-background" : "border-muted bg-muted/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                isActive ? "bg-success" : "bg-muted-foreground"
                              }`}
                            />
                            <span
                              className={`text-sm ${
                                isActive ? "text-foreground" : "text-muted-foreground"
                              }`}
                            >
                              {garden.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {isActive ? "Aktif" : "Pasif"}
                            </span>
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => handleToggleStatus(garden.id, isActive)}
                              aria-label={`${garden.name} bahçesini ${isActive ? 'pasif' : 'aktif'} yap`}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GardenManagementModal;
