import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { User, Settings, Bell, HelpCircle, LogOut, FlaskConical, UserCheck, ClipboardCheck, Database, KeyRound, Shield, FileCheck, Leaf } from "lucide-react";
import { useApp } from "@/contexts/AppContext";
import { useToast } from "@/hooks/use-toast";
import GardenManagementModal from "@/components/GardenManagementModal";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Only root (SUPER_ADMIN) sees test/dev tools and garden management
  const isSuperAdmin = localStorage.getItem("userRole") === "SUPER_ADMIN";
  const isAdmin = isSuperAdmin;
  
  // Garden management modal state
  const [isGardenManagementOpen, setIsGardenManagementOpen] = useState(false);

  const { 
    activeRole, 
    setActiveRole, 
    gardens,
    addCompletedInspection,
    addPendingEvaluation,
    addTestCriticalWarnings,
    addCompletedEvaluation,
    setSelectedGardenId
  } = useApp();
  
  const menuItems = [
    { icon: User, label: "Hesap Bilgileri" },
    { icon: Bell, label: "Bildirim Ayarları" },
    { icon: Settings, label: "Uygulama Ayarları" },
    { icon: HelpCircle, label: "Yardım & Destek" },
  ];

  const handleTestLogin = () => {
    navigate("/");
  };

  const handleTestAsConsultant = () => {
    setActiveRole("CONSULTANT");
    setSelectedGardenId(1);
    toast({ title: "Rol: Ziraat Danışmanı", duration: 2500 });
    navigate("/bahceler");
  };

  const handleTestAsLeadAuditor = () => {
    setActiveRole("LEAD_AUDITOR");
    setSelectedGardenId(1);
    toast({ title: "Rol: Ana Denetçi", duration: 2500 });
    navigate("/bahce/1");
  };

  const handleTestAsAdmin = () => {
    setActiveRole("ADMIN");
    toast({ title: "Rol: Yönetici" });
    navigate("/dashboard");
  };

  const handleCreateCompleted = () => {
    addCompletedInspection();
    toast({ title: "Rastgele bahçe için tamamlanmış denetim oluşturuldu", duration: 2500 });
  };

  const handleCreatePending = () => {
    addPendingEvaluation();
    toast({ title: "Rastgele bahçe için bekleyen değerlendirme oluşturuldu" });
  };

  const handleCreateWarnings = () => {
    addTestCriticalWarnings();
    toast({ title: "Rastgele bahçe için kritik uyarılar oluşturuldu", duration: 2500 });
  };

  const handleCreateCompletedEvaluation = () => {
    addCompletedEvaluation();
    toast({ title: "Rastgele bahçe için tamamlanmış değerlendirme oluşturuldu" });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header title="Profil" showNotification />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {/* Profile Card */}
        <div className="card-elevated p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User size={32} className="text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">
                {activeRole === "SUPER_ADMIN" ? "Sistem Yöneticisi" : activeRole === "CONSULTANT" ? "Ziraat Danışmanı" : activeRole === "LEAD_AUDITOR" ? "Ana Denetçi" : "Yönetici"}
              </h2>
              <p className="text-sm text-muted-foreground">
                danisma@dosttarim.com
              </p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
                activeRole === "SUPER_ADMIN"
                  ? 'bg-destructive/20 text-destructive'
                  : activeRole === "CONSULTANT" 
                    ? 'bg-warning/20 text-warning-foreground' 
                    : activeRole === "LEAD_AUDITOR"
                      ? 'bg-primary/20 text-primary'
                      : 'bg-success/20 text-success'
              }`}>
                {activeRole === "SUPER_ADMIN" ? "Root" : activeRole === "CONSULTANT" ? "Danışman" : activeRole === "LEAD_AUDITOR" ? "Denetçi" : "Yönetici"}
              </span>
            </div>
          </div>
        </div>
        
        {/* Garden Management Card - ADMIN and SUPER_ADMIN only */}
        {isAdmin && (
          <div className="card-elevated p-5">
            <div className="flex items-center gap-2 mb-3">
              <Leaf size={20} className="text-primary" />
              <h3 className="font-semibold text-foreground">Bahçe Yönetimi</h3>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Root</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Bahçe ekleyin veya mevcut bahçelerin durumunu yönetin.
            </p>
            <button
              onClick={() => setIsGardenManagementOpen(true)}
              className="w-full py-3 px-4 rounded-xl border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
            >
              <Leaf size={18} className="text-primary flex-shrink-0" />
              <div className="text-left">
                <p className="font-medium text-foreground">Bahçeleri Yönet</p>
                <p className="text-xs text-muted-foreground">Ekle, aktif/pasif yap</p>
              </div>
            </button>
          </div>
        )}
        
        {/* Test Mode Card - SUPER_ADMIN only */}
        {isSuperAdmin && (
          <div className="card-elevated p-5 border-2 border-dashed border-warning/50">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical size={20} className="text-warning" />
              <h3 className="font-semibold text-foreground">Test Modu</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Rol seç ve akışları hızlı test et
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleTestAsConsultant}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  activeRole === "CONSULTANT"
                    ? 'border-warning bg-warning/10'
                    : 'border-border hover:border-warning/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
                  <UserCheck size={20} className="text-warning" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Ziraat Danışmanı Olarak Test Et</p>
                  <p className="text-xs text-muted-foreground">Denetim formunu doldur ve gönder</p>
                </div>
              </button>
              
              <button
                onClick={handleTestAsLeadAuditor}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  activeRole === "LEAD_AUDITOR"
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <ClipboardCheck size={20} className="text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Ana Denetçi Olarak Test Et</p>
                  <p className="text-xs text-muted-foreground">Değerlendirme yap ve skor ver</p>
                </div>
              </button>

              <button
                onClick={handleTestAsAdmin}
                className={`w-full p-4 rounded-xl border-2 flex items-center gap-3 transition-colors ${
                  activeRole === "ADMIN"
                    ? 'border-success bg-success/10'
                    : 'border-border hover:border-success/50'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                  <Shield size={20} className="text-success" />
                </div>
                <div className="text-left">
                  <p className="font-medium text-foreground">Yönetici Olarak Test Et</p>
                  <p className="text-xs text-muted-foreground">Tüm yetkilere sahip ol</p>
                </div>
              </button>
            </div>
            
            {/* Quick Links */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-border">
              <button
                onClick={() => navigate("/bahce/1/denetim", {
                  state: { entry: "start" },
                })}
                className="flex-1 py-2 text-sm text-center text-muted-foreground hover:text-foreground border border-border rounded-xl"
              >
                Denetim Formunu Aç
              </button>
              <button
                onClick={() => navigate("/bahce/1/degerlendirme")}
                className="flex-1 py-2 text-sm text-center text-muted-foreground hover:text-foreground border border-border rounded-xl"
              >
                Değerlendirme Formunu Aç
              </button>
            </div>
          </div>
        )}

        {/* Test Data Generation Card - SUPER_ADMIN only */}
        {isSuperAdmin && (
          <div className="card-elevated p-5 border-2 border-dashed border-muted-foreground/30">
            <div className="flex items-center gap-2 mb-3">
              <Database size={20} className="text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Test Verisi Oluştur</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Hızlı test için örnek veri oluştur
            </p>
            
            <div className="space-y-2">
              <button
                onClick={handleCreateCompleted}
                className="w-full py-3 px-4 text-left rounded-xl border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <ClipboardCheck size={18} className="text-success flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tamamlanmış Denetim Oluştur</p>
                  <p className="text-xs text-muted-foreground">Dashboard ve grafiklerde görünür</p>
                </div>
              </button>
              
              <button
                onClick={handleCreatePending}
                className="w-full py-3 px-4 text-left rounded-xl border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <UserCheck size={18} className="text-warning flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Bekleyen Değerlendirme Oluştur</p>
                  <p className="text-xs text-muted-foreground">Ana denetçi için bekleyen görev</p>
                </div>
              </button>
              
              <button
                onClick={handleCreateCompletedEvaluation}
                className="w-full py-3 px-4 text-left rounded-xl border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <FileCheck size={18} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Tamamlanmış Değerlendirme Oluştur</p>
                  <p className="text-xs text-muted-foreground">Skorlu değerlendirme verisi</p>
                </div>
              </button>

              <button
                onClick={handleCreateWarnings}
                className="w-full py-3 px-4 text-left rounded-xl border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <Bell size={18} className="text-destructive flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Kritik Uyarı Test Verisi</p>
                  <p className="text-xs text-muted-foreground">Açık ve kapalı uyarı örnekleri</p>
                </div>
              </button>
              
              <button
                onClick={handleTestLogin}
                className="w-full py-3 px-4 text-left rounded-xl border border-border hover:bg-muted/50 transition-colors flex items-center gap-3"
              >
                <KeyRound size={18} className="text-primary flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-foreground">Login Ekranını Test Et</p>
                  <p className="text-xs text-muted-foreground">Giriş ekranına git</p>
                </div>
              </button>
            </div>
          </div>
        )}
        
        {/* Menu Items */}
        <div className="card-elevated divide-y divide-border">
          {menuItems.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <Icon size={22} className="text-muted-foreground" />
              <span className="text-foreground">{label}</span>
            </button>
          ))}
        </div>
        
        
        {/* Logout Button */}
        <button className="card-elevated w-full flex items-center gap-4 p-4 hover:bg-destructive/5 transition-colors text-destructive">
          <LogOut size={22} />
          <span>Çıkış Yap</span>
        </button>
      </main>
      
      <BottomNav />
      
      {/* Garden Management Modal */}
      <GardenManagementModal
        isOpen={isGardenManagementOpen}
        onClose={() => setIsGardenManagementOpen(false)}
      />
    </div>
  );
};

export default Profile;
