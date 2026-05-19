import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { UserProfile } from "@/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedProfiles?: UserProfile[];
}

export function ProtectedRoute({ children, allowedProfiles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Profile may still be loading after auth state change
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (allowedProfiles && !allowedProfiles.includes(profile.perfil)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}