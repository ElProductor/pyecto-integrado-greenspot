import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile, IAMPermissions } from '../types';

interface IAMContextType {
  role: UserRole;
  user: UserProfile;
  permissions: IAMPermissions;
  isAdmin: boolean;
  isOperator: boolean;
  switchRole: (newRole: UserRole) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
}

const STORAGE_KEY = 'greenspot_iam_role';

const PROFILES: Record<UserRole, UserProfile> = {
  admin: {
    id: 'user-admin',
    name: 'Benjamín González',
    email: 'bgonzalez@greenspot.cl',
    role: 'admin',
    title: 'Administrador General • Gerencia',
    plantLocation: 'Puerto Montt & Dalcahue',
    avatarInitials: 'BG'
  },
  operator: {
    id: 'user-operator',
    name: 'Carlos Paredes',
    email: 'operario.patio@greenspot.cl',
    role: 'operator',
    title: 'Operario de Planta • Patio & Molienda',
    plantLocation: 'Planta Dalcahue, Chiloé',
    avatarInitials: 'CP'
  }
};

const PERMISSIONS: Record<UserRole, IAMPermissions> = {
  admin: {
    canViewAllTabs: true,
    canViewClients: true,
    canManageClients: true,
    canDeleteRecords: true,
    canViewFinancials: true,
    canEditTechnicalSpecs: true,
    canIssueCertificates: true,
    canAccessDatabaseSettings: true,
    canExportDatabase: true,
    canRecordMovements: true,
    canWeighTrucks: true,
    canAdvanceBatches: true,
    canAdjustPhysicalStock: true
  },
  operator: {
    canViewAllTabs: false,
    canViewClients: false, // Operarios de planta no gestionan clientes ni contratos comerciales
    canManageClients: false,
    canDeleteRecords: false, // Operarios no pueden borrar datos del sistema
    canViewFinancials: false, // Costos USD, precios y márgenes ocultos para el piso de planta
    canEditTechnicalSpecs: false, // Fórmulas MFI y densidad gestionadas por jefatura
    canIssueCertificates: false, // Certificados legales Ley REP solo emitidos por administración
    canAccessDatabaseSettings: false, // Claves y conexión Supabase protegidas
    canExportDatabase: false,
    canRecordMovements: true, // Registrar pesajes y consumos en patio
    canWeighTrucks: true, // Operar la romana de camiones
    canAdvanceBatches: true, // Pasar lotes de Lavado -> Molienda -> Pellet -> Despacho
    canAdjustPhysicalStock: true // Ajuste de conteo físico en silos
  }
};

const IAMContext = createContext<IAMContextType | undefined>(undefined);

export const IAMProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'operator' || stored === 'admin') {
        return stored;
      }
    } catch (e) {
      console.warn('Error reading IAM role from localStorage:', e);
    }
    return 'admin'; // Por defecto Administrador
  });

  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, role);
    } catch (e) {
      console.warn('Error saving IAM role to localStorage:', e);
    }
  }, [role]);

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
  };

  const user = PROFILES[role];
  const permissions = PERMISSIONS[role];
  const isAdmin = role === 'admin';
  const isOperator = role === 'operator';

  return (
    <IAMContext.Provider
      value={{
        role,
        user,
        permissions,
        isAdmin,
        isOperator,
        switchRole,
        isRoleModalOpen,
        setIsRoleModalOpen
      }}
    >
      {children}
    </IAMContext.Provider>
  );
};

export const useIAM = (): IAMContextType => {
  const context = useContext(IAMContext);
  if (!context) {
    throw new Error('useIAM debe ser usado dentro de un IAMProvider');
  }
  return context;
};
