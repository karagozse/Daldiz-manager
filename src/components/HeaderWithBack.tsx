import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import GlobalWarningsModal from "./GlobalWarningsModal";
import { useApp } from "@/contexts/AppContext";

interface HeaderWithBackProps {
  title: string;
  subtitle?: string;
  showNotification?: boolean;
  onBack?: () => void;
}

const HeaderWithBack = ({ 
  title, 
  subtitle,
  showNotification = false,
  onBack 
}: HeaderWithBackProps) => {
  const navigate = useNavigate();
  const [warningsModalOpen, setWarningsModalOpen] = useState(false);
  const { gardens } = useApp();
  const totalOpenCriticalCount = gardens.reduce((s, g) => s + (g.openCriticalWarningCount ?? 0), 0);
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
    <header className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="flex items-center px-4 py-3 max-w-lg mx-auto">
        <button 
          onClick={handleBack}
          className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          aria-label="Geri dön"
          title="Geri dön"
        >
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        
        <div className="flex-1 flex items-center justify-center px-2">
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        
        <div className="w-12 flex justify-end">
          {showNotification && (
            <NotificationBell
              count={totalOpenCriticalCount}
              onClick={() => setWarningsModalOpen(true)}
              size={24}
              className="text-muted-foreground"
            />
          )}
        </div>
      </div>
    </header>
    {showNotification && (
      <GlobalWarningsModal
        isOpen={warningsModalOpen}
        onClose={() => setWarningsModalOpen(false)}
      />
    )}
    </>
  );
};

export default HeaderWithBack;
