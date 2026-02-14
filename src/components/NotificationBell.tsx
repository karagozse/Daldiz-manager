/**
 * NotificationBell - Header zil ikonu + isteğe bağlı kritik sayı badge'i
 *
 * - Zil ikonu aynı boyutta kalır.
 * - count > 0 ise sağ üst köşede kırmızı daire içinde sayı (beyaz); 99+ gösterimi.
 * - count === 0 ise badge görünmez.
 */

import { Bell } from "lucide-react";

interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
  size?: number;
  className?: string;
  "aria-label"?: string;
  title?: string;
}

const NotificationBell = ({
  count = 0,
  onClick,
  size = 20,
  className = "text-muted-foreground",
  "aria-label": ariaLabel = "Bildirimler",
  title = "Bildirimler",
}: NotificationBellProps) => {
  const showBadge = count > 0;
  const badgeLabel = count > 99 ? "99+" : String(count);

  const content = (
    <span className="relative inline-flex">
      <Bell size={size} className={className} />
      {showBadge && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold px-1"
          aria-hidden
        >
          {badgeLabel}
        </span>
      )}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className="min-w-10 min-h-10 w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
        onClick={onClick}
        aria-label={ariaLabel}
        title={title}
      >
        {content}
      </button>
    );
  }

  return <span className="min-w-10 min-h-10 w-10 h-10 flex items-center justify-center">{content}</span>;
};

export default NotificationBell;
