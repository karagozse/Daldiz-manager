/**
 * DALDIZLogo - Logo component for DALDIZ application
 */

import React from "react";
import daldizLogo from "@/assets/daldiz-logo.svg";

interface DALDIZLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

const DALDIZLogo: React.FC<DALDIZLogoProps> = ({ 
  size = "md", 
  showText = false,
  className = "" 
}) => {
  const sizeConfig = {
    sm: { height: 24, text: "text-xs", spacing: "gap-1.5" },
    md: { height: 36, text: "text-sm", spacing: "gap-2" },
    lg: { height: 64, text: "text-lg", spacing: "gap-3" },
  };
  
  const config = sizeConfig[size];
  
  return (
    <div className={`flex items-center ${config.spacing} ${className}`}>
      <img 
        src={daldizLogo} 
        alt="DALDIZ"
        style={{ height: config.height }}
        className="object-contain"
      />
      {showText && (
        <span className={`font-semibold text-foreground ${config.text}`}>
          DALDIZ
        </span>
      )}
    </div>
  );
};

export default DALDIZLogo;
