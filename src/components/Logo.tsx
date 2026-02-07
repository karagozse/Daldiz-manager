import dostLogo from "@/assets/dost-logo.jpg";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

const Logo = ({ size = "sm", showText = true }: LogoProps) => {
  const sizeConfig = {
    sm: { height: 24, text: "text-xs", spacing: "gap-1.5" },
    md: { height: 36, text: "text-sm", spacing: "gap-2" },
    lg: { height: 64, text: "text-lg", spacing: "gap-3" },
  };
  
  const config = sizeConfig[size];
  
  return (
    <div className={`flex items-center ${config.spacing}`}>
      <img 
        src={dostLogo} 
        alt="Dost Tarım Teknolojileri"
        style={{ height: config.height }}
        className="object-contain"
      />
      {showText && size === "lg" && (
        <div className="flex flex-col">
          <span className={`font-semibold text-foreground leading-tight ${config.text}`}>
            Dost Tarım
          </span>
          <span className="text-sm text-muted-foreground leading-tight">
            Teknolojileri
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
