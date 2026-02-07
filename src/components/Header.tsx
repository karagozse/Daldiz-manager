import { Bell, User, ClipboardList } from "lucide-react";
import { useState } from "react";
import GlobalWarningsModal from "./GlobalWarningsModal";
import ProfileMenuSheet from "./ProfileMenuSheet";
import ReviewTasksModal from "./ReviewTasksModal";
import { useApp } from "@/contexts/AppContext";
import { mapBackendRoleToSemantic, can } from "@/lib/permissions";

interface HeaderProps {
  title: string;
  showNotification?: boolean;
  showProfile?: boolean;
}

const Header = ({ title, showNotification = true, showProfile = false }: HeaderProps) => {
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [reviewTasksOpen, setReviewTasksOpen] = useState(false);

  const { activeRole } = useApp();
  const role = mapBackendRoleToSemantic(activeRole ?? "");
  const showTaskCenter = can.seeTaskCenter(role);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="w-10 flex justify-start">
            {showProfile && (
              <button 
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
                onClick={() => setProfileMenuOpen(true)}
                aria-label="Profil menüsü"
                title="Profil menüsü"
              >
                <User size={20} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center justify-end gap-0.5 min-w-[2.5rem]">
            {showTaskCenter && (
              <button
                type="button"
                className="p-1.5 hover:bg-muted rounded-full transition-colors"
                onClick={() => setReviewTasksOpen(true)}
                aria-label="Görev Merkezi"
                title="Görev Merkezi"
              >
                <ClipboardList size={20} className="text-muted-foreground" />
              </button>
            )}
            {showNotification && (
              <button 
                className="p-1.5 hover:bg-muted rounded-full transition-colors relative"
                onClick={() => setWarningsModalOpen(true)}
                aria-label="Bildirimler"
                title="Bildirimler"
              >
                <Bell size={20} className="text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>
      
      <GlobalWarningsModal
        isOpen={warningsModalOpen}
        onClose={() => setWarningsModalOpen(false)}
      />

      <ReviewTasksModal open={reviewTasksOpen} onClose={() => setReviewTasksOpen(false)} />
      
      {showProfile && (
        <ProfileMenuSheet
          isOpen={profileMenuOpen}
          onClose={() => setProfileMenuOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
