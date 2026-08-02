import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { dashboardColors as C } from '../../design-system/tokens';

interface RoleGuardProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ roles, children, fallback }: RoleGuardProps) {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return fallback ? <>{fallback}</> : (
      <div style={{ padding: 40, textAlign: 'center', color: C.textLo, fontFamily: C.F }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Authentication Required</div>
        <div style={{ fontSize: 11 }}>Please log in to access this page.</div>
      </div>
    );
  }

  if (!roles.includes(user.role)) {
    return fallback ? <>{fallback}</> : (
      <div style={{ padding: 40, textAlign: 'center', color: C.textLo, fontFamily: C.F }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🚫</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.critical, marginBottom: 4 }}>Access Denied</div>
        <div style={{ fontSize: 11 }}>
          Your role ({user.role.toUpperCase()}) does not have permission to view this page.
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function withRoleGuard<P extends object>(Component: React.ComponentType<P>, roles: string[]) {
  return function GuardedComponent(props: P) {
    return (
      <RoleGuard roles={roles}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}
