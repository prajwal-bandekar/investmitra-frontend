import { Navigate } from 'react-router-dom';
import { useApp } from './AppShell';

/** Route guard for admin-only pages. Advisors stand in for admins until an admin role exists. */
export default function RequireAdvisor({ children }) {
  const { isAdvisor } = useApp();
  return isAdvisor ? children : <Navigate to="/app/markets" replace />;
}
