import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { AddMedicinePage } from './pages/AddMedicinePage';
import { CabinetPage } from './pages/CabinetPage';
import { InviteAcceptPage } from './pages/InviteAcceptPage';
import { MedicineDetailPage } from './pages/MedicineDetailPage';
import { MembersPage } from './pages/MembersPage';

export const cabinetRoutes: RouteObject[] = [
  { path: '/invite/:code', element: <ProtectedRoute><InviteAcceptPage /></ProtectedRoute> },
  { path: '/cabinets/:cabinetId', element: <ProtectedRoute><CabinetPage /></ProtectedRoute> },
  { path: '/cabinets/:cabinetId/members', element: <ProtectedRoute><MembersPage /></ProtectedRoute> },
  { path: '/cabinets/:cabinetId/add-medicine', element: <ProtectedRoute><AddMedicinePage /></ProtectedRoute> },
  { path: '/cabinets/:cabinetId/medicines/:medId', element: <ProtectedRoute><MedicineDetailPage /></ProtectedRoute> },
];
