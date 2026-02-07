import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/AppContext";

/**
 * Backend/DB bağlantısı koptuğunda gösterilen modal.
 * "Giriş Yap" ile logout + login sayfasına yönlendirir.
 */
export function BackendConnectionLostModal() {
  const navigate = useNavigate();
  const { backendConnectionLost, logout } = useApp();

  const handleRelogin = () => {
    logout();
    navigate("/");
  };

  return (
    <Dialog open={backendConnectionLost}>
      <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Bağlantı Sorunu</DialogTitle>
          <DialogDescription>
            Database bağlantısı koptu. Lütfen tekrar giriş yapın.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={handleRelogin}>Giriş Yap</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
