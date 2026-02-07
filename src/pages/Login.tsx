import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import daldizLogo from "@/assets/daldiz-logo.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useApp, authenticateUser } from "@/contexts/AppContext";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setActiveRole, setAuthToken, setCurrentUser, loadInitialDataFromApi, setIsUsingMockBackend } = useApp();
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast({
        title: "Hata",
        description: "Kullanıcı adı ve şifre gereklidir",
        variant: "destructive",
        duration: 4500,
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Backend API'ye login isteği - AppContext'teki authenticateUser fonksiyonu kullanılıyor
      const user = await authenticateUser(username.trim(), password, setAuthToken, setCurrentUser, setIsUsingMockBackend);
      
      if (user) {
        // Store user data in localStorage (authenticateUser zaten token'ı localStorage'a kaydediyor)
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("username", user.username);
        localStorage.setItem("userRole", user.role);
        localStorage.setItem("userDisplayName", user.displayName);

        // Sync role into AppContext immediately (AppProvider doesn't remount on navigation)
        setActiveRole(user.role);

        // Login başarılı olduktan sonra backend'den kampüs ve bahçe verilerini yükle
        await loadInitialDataFromApi();

        toast({
          title: "Giriş Başarılı",
          description: `Hoş geldiniz, ${user.displayName}`,
          duration: 2500,
        });

        setIsLoading(false);
        navigate("/dashboard");
      } else {
        // authenticateUser null döndü - kullanıcı bulunamadı
        toast({
          title: "Hata",
          description: "Kullanıcı adı veya şifre hatalı",
          variant: "destructive",
          duration: 4500,
        });
        setIsLoading(false);
      }
    } catch (error) {
      // Handle authentication errors
      const errorMessage = error instanceof Error ? error.message : "Bir hata oluştu";
      
      toast({
        title: "Hata",
        description: errorMessage.includes("Invalid credentials") || errorMessage.includes("401")
          ? "Kullanıcı adı veya şifre hatalı"
          : errorMessage,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    toast({
      title: "Şifre Sıfırlama",
      description: "Sistem Yöneticisi (admin) ile görüşün",
      duration: 2500,
    });
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-start bg-muted pt-[26vh] pb-[8vh] md:pt-[18vh] lg:pt-[16vh] px-6">
      {/* Daldız Brand Mark - Outside and above the card */}
      <div className="flex flex-col items-center gap-2 mb-10">
        <img 
          src={daldizLogo} 
          alt="daldız logo" 
          className="h-14 w-auto opacity-95"
        />
        <span 
          className="text-lg font-medium tracking-wide text-foreground/90"
          style={{ 
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontWeight: 600,
          }}
        >
          daldız
        </span>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-sm">
        <div className="card-elevated shadow-md rounded-xl p-6 mb-2">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Username */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-foreground">
                Kullanıcı Adı
              </label>
              <Input
                id="username"
                type="text"
                placeholder="kullanici@dosttarim.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12"
              />
            </div>
            
            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-foreground">
                Şifre
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  title={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            
            {/* Remember Me */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label 
                  htmlFor="remember" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Beni Hatırla
                </label>
              </div>
              
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-primary hover:underline"
              >
                Şifremi Unuttum
              </button>
            </div>
            
            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn size={18} />
                  Giriş Yap
                </span>
              )}
            </Button>
          </form>
        </div>
        
        {/* Copyright - Directly under the card */}
        <p className="text-xs text-muted-foreground mt-1 text-center">
          ©2026 daldız — Tarımsal Denetim Platformu
        </p>
      </div>
    </div>
  );
};

export default Login;
