import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, LogOut, Info } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import { enableWebPushNotifications } from "@/lib/pushSubscription";
import {
  fetchNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings,
} from "@/lib/notifications";

interface ProfileMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProfileMenuSheet = ({ isOpen, onClose }: ProfileMenuSheetProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { activeRole, logout } = useApp();

  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [enablingNotifications, setEnablingNotifications] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoadingSettings(true);
    fetchNotificationSettings()
      .then((data) => setSettings(data))
      .catch((err) => {
        console.error("Bildirim ayarları yüklenemedi:", err);
        toast({
          title: "Bildirim ayarları yüklenemedi",
          variant: "destructive",
          duration: 4500,
        });
      })
      .finally(() => setLoadingSettings(false));
  }, [isOpen, toast]);

  useEffect(() => {
    if (!isOpen) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  }, [isOpen]);

  const handleCampusToggle = (key: "belek" | "candir" | "manavgat" | "all") => {
    if (!settings) return;

    let next: NotificationSettings;

    if (key === "all") {
      const v = !(settings.campusBelek && settings.campusCandir && settings.campusManavgat);
      next = {
        ...settings,
        campusBelek: v,
        campusCandir: v,
        campusManavgat: v,
      };
    } else {
      const k =
        key === "belek"
          ? "campusBelek"
          : key === "candir"
            ? "campusCandir"
            : "campusManavgat";

      next = {
        ...settings,
        [k]: !settings[k],
      } as NotificationSettings;
    }

    setSettings(next);
    void handleSaveSettings(next);
  };

  const handleTypeToggle = (
    key: "enableNewEvaluation" | "enableNewPrescription" | "enableNewCriticalWarning"
  ) => {
    if (!settings) return;

    const next: NotificationSettings = {
      ...settings,
      [key]: !settings[key],
    };

    setSettings(next);
    void handleSaveSettings(next);
  };

  const handleSaveSettings = async (next?: NotificationSettings) => {
    const current = next ?? settings;
    if (!current || savingSettings) return;
    setSavingSettings(true);
    try {
      const saved = await updateNotificationSettings(current);
      setSettings(saved);
      toast({ title: "Bildirim ayarları kaydedildi" });
    } catch (error) {
      console.error("Ayarlar kaydedilemedi:", error);
      toast({
        title: "Ayarlar kaydedilirken bir hata oluştu",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleEnableNotifications = async () => {
    if (enablingNotifications) return;
    setEnablingNotifications(true);
    try {
      const result = await enableWebPushNotifications();
      if (result.ok) {
        setNotificationsEnabled(true);
        toast({ title: "Başarılı", description: "Bildirimler etkinleştirildi.", duration: 2500 });
      } else {
        setNotificationsEnabled(false);
        toast({
          title: "Uyarı",
          description: result.message ?? "Bildirimler etkinleştirilemedi.",
          variant: "destructive",
          duration: 4500,
        });
      }
    } catch (error) {
      console.error("Bildirimleri etkinleştirirken hata:", error);
      setNotificationsEnabled(false);
      toast({
        title: "Hata",
        description: "Beklenmedik bir hata oluştu.",
        variant: "destructive",
        duration: 4500,
      });
    } finally {
      setEnablingNotifications(false);
    }
  };

  const handleNotificationToggle = (checked: boolean) => {
    if (checked) {
      // ON konumuna geliyorsa mevcut handleEnableNotifications kullanılsın
      handleEnableNotifications();
    } else {
      // OFF olursa sadece UI tarafında kapatalım (izin tarayıcıdan geri alınamıyor)
      setNotificationsEnabled(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("username");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userDisplayName");
    logout();
    onClose();
    navigate("/");
  };

  const loggedInDisplayName = localStorage.getItem("userDisplayName") || "";

  const getRoleDisplayName = () => {
    if (loggedInDisplayName) return loggedInDisplayName;
    switch (activeRole) {
      case "CONSULTANT":
        return "Ziraat Danışmanı";
      case "LEAD_AUDITOR":
        return "Denetçi";
      case "ADMIN":
        return "Yönetici";
      case "SUPER_ADMIN":
        return "Sistem Yöneticisi";
      default:
        return "Kullanıcı";
    }
  };

  const getRoleDescription = () => {
    switch (activeRole) {
      case "CONSULTANT":
        return "Denetim başlatabilir, reçete yazabilirsiniz. Onaya düşen denetim/reçeteleri görürsünüz ancak değerlendiremezsiniz.";
      case "LEAD_AUDITOR":
        return "Onaya düşen denetimleri değerlendirir, skor verir ve kritik uyarı açar. Reçete onaylama yetkiniz vardır.";
      case "ADMIN":
        return "Tüm sayfalara erişir, verileri görüntüleyebilirsiniz. Denetim/reçete aksiyonları yetkiniz dışındadır (salt okunur).";
      case "SUPER_ADMIN":
        return "En üst yetki. Tüm işlemleri gerçekleştirebilirsiniz.";
      default:
        return "";
    }
  };

  const allCampuses = !!(
    settings?.campusBelek &&
    settings?.campusCandir &&
    settings?.campusManavgat
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <span>Hesap Menüsü</span>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Kullanıcı hesap bilgilerini ve bildirim ayarlarını gösteren menü.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-150px)] pr-4">
          <div className="space-y-6 py-4">
            {/* 1. Account Info */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Info size={18} className="text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Hesap Bilgileri</h3>
              </div>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Kullanıcı Rolü</span>
                  <span
                    className={`text-sm font-medium px-2 py-0.5 rounded-full ${
                      activeRole === "CONSULTANT"
                        ? "bg-warning/20 text-warning-foreground"
                        : activeRole === "LEAD_AUDITOR"
                          ? "bg-primary/20 text-primary"
                          : "bg-success/20 text-success"
                    }`}
                  >
                    {getRoleDisplayName()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                  {getRoleDescription()}
                </p>
              </div>
            </section>

            {/* 2. Notification Settings */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-foreground">Bildirim Ayarları</h3>
              </div>

              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Bildirimleri etkinleştir
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tarayıcı bildirimleri için izin verin.
                    </p>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    disabled={enablingNotifications}
                    onCheckedChange={handleNotificationToggle}
                    aria-label="Tarayıcı bildirimlerini etkinleştir"
                  />
                </div>

                {loadingSettings ? (
                  <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground">
                    Ayarlar yükleniyor…
                  </div>
                ) : (
                  <>
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-sm font-medium text-foreground mb-3">
                        Kampüs Bildirimleri
                      </p>
                      <div className="space-y-3">
                        {[
                          { id: "belek" as const, label: "Belek" },
                          { id: "candir" as const, label: "Çandır" },
                          { id: "manavgat" as const, label: "Manavgat" },
                          { id: "all" as const, label: "Tümü" },
                        ].map((c) => (
                          <div
                            key={c.id}
                            className="flex justify-between items-center"
                          >
                            <label
                              htmlFor={`campus-${c.id}`}
                              className="text-sm text-muted-foreground cursor-pointer"
                            >
                              {c.label}
                            </label>
                            <Switch
                              id={`campus-${c.id}`}
                              checked={
                                c.id === "all"
                                  ? allCampuses
                                  : !!settings?.[
                                      c.id === "belek"
                                        ? "campusBelek"
                                        : c.id === "candir"
                                          ? "campusCandir"
                                          : "campusManavgat"
                                    ]
                              }
                              onCheckedChange={() => handleCampusToggle(c.id)}
                              aria-label={`${c.label} kampüs bildirimlerini ${c.id === "all" ? allCampuses : settings?.[c.id === "belek" ? "campusBelek" : c.id === "candir" ? "campusCandir" : "campusManavgat"] ? "kapat" : "aç"}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-sm font-medium text-foreground mb-3">
                        Bildirim Türleri
                      </p>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label
                            htmlFor="notif-new-evaluation"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Yeni değerlendirme
                          </label>
                          <Switch
                            id="notif-new-evaluation"
                            checked={!!settings?.enableNewEvaluation}
                            onCheckedChange={() =>
                              handleTypeToggle("enableNewEvaluation")
                            }
                            aria-label={`Yeni denetim raporu bildirimlerini ${settings?.enableNewEvaluation ? "kapat" : "aç"}`}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <label
                            htmlFor="notif-new-prescription"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Yeni reçete
                          </label>
                          <Switch
                            id="notif-new-prescription"
                            checked={!!settings?.enableNewPrescription}
                            onCheckedChange={() =>
                              handleTypeToggle("enableNewPrescription")
                            }
                            aria-label={`Yeni reçete bildirimlerini ${settings?.enableNewPrescription ? "kapat" : "aç"}`}
                          />
                        </div>
                        <div className="flex justify-between items-center">
                          <label
                            htmlFor="notif-new-warning"
                            className="text-sm text-muted-foreground cursor-pointer"
                          >
                            Yeni kritik uyarı
                          </label>
                          <Switch
                            id="notif-new-warning"
                            checked={!!settings?.enableNewCriticalWarning}
                            onCheckedChange={() =>
                              handleTypeToggle("enableNewCriticalWarning")
                            }
                            aria-label={`Yeni kritik uyarı bildirimlerini ${settings?.enableNewCriticalWarning ? "kapat" : "aç"}`}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 3. Logout */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Çıkış Yap</span>
            </button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileMenuSheet;
