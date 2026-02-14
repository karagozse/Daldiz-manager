import { User, ClipboardList } from "lucide-react";
import { useState } from "react";
import GlobalWarningsModal from "./GlobalWarningsModal";
import ProfileMenuSheet from "./ProfileMenuSheet";
import ReviewTasksModal from "./ReviewTasksModal";
import NotificationBell from "./NotificationBell";
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

  const { activeRole, gardens } = useApp();
  const totalOpenCriticalCount = gardens.reduce((s, g) => s + (g.openCriticalWarningCount ?? 0), 0);
  const role = mapBackendRoleToSemantic(activeRole ?? "");
  const showTaskCenter = can.seeTaskCenter(role);

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="w-12 flex justify-start">
            {showProfile && (
              <button
                type="button"
                className="min-w-10 min-h-10 w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                onClick={() => setProfileMenuOpen(true)}
                aria-label="Profil menüsü"
                title="Profil menüsü"
              >
                <User size={24} className="text-muted-foreground" />
              </button>
            )}
          </div>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          <div className="flex items-center justify-end gap-0.5 min-w-[2.5rem]">
            {showTaskCenter && (
              <button
                type="button"
                className="min-w-10 min-h-10 w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                onClick={() => setReviewTasksOpen(true)}
                aria-label="Görev Merkezi"
                title="Görev Merkezi"
              >
                <ClipboardList size={24} className="text-muted-foreground" />
              </button>
            )}
            {showNotification && (
              <NotificationBell
                count={totalOpenCriticalCount}
                onClick={() => setWarningsModalOpen(true)}
                size={24}
              />
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
