import { Navigate } from "react-router-dom";

// This page is deprecated. Redirect to portal login.
export default function AgendarVistoria() {
  return <Navigate to="/cliente/login" replace />;
}
