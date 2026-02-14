/**
 * CriticalBadge - Single Source of Truth for Critical Warning Badges
 * 
 * ╔════════════════════════════════════════════════════════════════════════════╗
 * ║  THIS IS THE ONLY CRITICAL BADGE COMPONENT                                 ║
 * ║  Use this everywhere: Dashboard, Gardens, Garden Detail, Inspection        ║
 * ╚════════════════════════════════════════════════════════════════════════════╝
 * 
 * RULES:
 * - If count > 0: RED badge with Bell icon + "X Kritik", CLICKABLE
 * - If count == 0: GREEN badge with "Kritik Yok", NOT CLICKABLE
 * - Same styling everywhere (kritik = zil ikonu, üçgen kullanılmaz)
 */

import { Bell, CheckCircle } from "lucide-react";

interface CriticalBadgeProps {
  count: number;
  onClick?: () => void;
  size?: "sm" | "md";
}

const CriticalBadge = ({ count, onClick, size = "md" }: CriticalBadgeProps) => {
  const hasWarnings = count > 0;
  
  const sizeClasses = size === "sm" 
    ? "px-2 py-0.5 text-xs gap-1"
    : "px-2.5 py-1 text-xs gap-1.5";
  
  const iconSize = size === "sm" ? 12 : 14;
  
  if (hasWarnings) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={`inline-flex items-center rounded-full font-medium transition-colors bg-destructive/10 text-destructive hover:bg-destructive/20 cursor-pointer ${sizeClasses}`}
      >
        <Bell size={iconSize} className="text-destructive" />
        <span>{count} Kritik</span>
      </button>
    );
  }
  
  return (
    <span className={`inline-flex items-center rounded-full font-medium bg-success/10 text-success cursor-default ${sizeClasses}`}>
      <CheckCircle size={iconSize} />
      <span>Kritik Yok</span>
    </span>
  );
};

export default CriticalBadge;
