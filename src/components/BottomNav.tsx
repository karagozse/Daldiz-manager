import { Link, useLocation } from "react-router-dom";
import { Home, Leaf, BarChart3, Package } from "lucide-react";
import { BOTTOM_TAB_HEIGHT_PX } from "@/constants/layout";

const BottomNav = () => {
  const location = useLocation();
  
  const navItems = [
    { path: "/dashboard", label: "Ana Sayfa", icon: Home },
    { path: "/bahceler", label: "Bahçeler", icon: Leaf },
    { path: "/hasat", label: "Hasat", icon: Package },
    { path: "/analiz", label: "Analiz", icon: BarChart3 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30" style={{ paddingBottom: 'env(safe-area-inset-bottom)', height: `calc(${BOTTOM_TAB_HEIGHT_PX}px + env(safe-area-inset-bottom))` }}>
      <div className="flex items-center justify-around py-3 px-4 max-w-lg mx-auto h-full" style={{ transform: 'translateY(-8px)' }}>
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-colors ${
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon 
                size={22} 
                strokeWidth={isActive ? 2.5 : 2}
                className={isActive ? "fill-primary/20" : ""}
              />
              <span className={`text-xs ${isActive ? "font-semibold" : "font-medium"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
