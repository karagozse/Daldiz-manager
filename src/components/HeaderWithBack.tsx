import { ArrowLeft, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
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
        
        <div className="w-10 flex justify-end">
          {showNotification && (
            <button 
              className="p-2 hover:bg-muted rounded-full transition-colors"
              aria-label="Bildirimler"
              title="Bildirimler"
            >
              <Bell size={22} className="text-warning" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default HeaderWithBack;
