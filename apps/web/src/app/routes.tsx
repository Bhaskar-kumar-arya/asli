import { Route, Routes } from 'react-router-dom';
import { App } from '../App';
import { AddMedicinePage } from '../features/cabinet/pages/AddMedicinePage';
import { CabinetPage } from '../features/cabinet/pages/CabinetPage';
import { InviteAcceptPage } from '../features/cabinet/pages/InviteAcceptPage';
import { MedicineDetailPage } from '../features/cabinet/pages/MedicineDetailPage';
import { MembersPage } from '../features/cabinet/pages/MembersPage';

// Bootstrap router shell - D1 owns the app shell (screens 1, 2, 11) and will likely restructure
// this file once it starts; each lane adds its own <Route> here in the meantime (see CLAUDE.md
// "Stay in your lane" - D3 added the /cabinets and /invite routes below).
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/invite/:code" element={<InviteAcceptPage />} />
      <Route path="/cabinets/:cabinetId/members" element={<MembersPage />} />
      <Route path="/cabinets/:cabinetId/add-medicine" element={<AddMedicinePage />} />
      <Route path="/cabinets/:cabinetId/medicines/:medId" element={<MedicineDetailPage />} />
      <Route path="/cabinets/:cabinetId" element={<CabinetPage />} />
      <Route path="/*" element={<App />} />
    </Routes>
  );
}
