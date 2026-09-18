import { Outlet } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '../../auth/ProtectedRoute';
import { ScanFlowProvider } from './lib/scanFlow';
import { MethodChooserScreen } from './screens/MethodChooserScreen';
import { CaptureScreen } from './screens/CaptureScreen';
import { ConfirmDetailsScreen } from './screens/ConfirmDetailsScreen';
import { ManualEntryScreen } from './screens/ManualEntryScreen';
import { ResultScreen } from './screens/ResultScreen';
import { BillResultsScreen } from './screens/BillResultsScreen';

function ScanLayout() {
  return (
    <ProtectedRoute>
      <ScanFlowProvider>
        <Outlet />
      </ScanFlowProvider>
    </ProtectedRoute>
  );
}

export const scanRoutes: RouteObject[] = [
  {
    path: '/scan',
    element: <ScanLayout />,
    children: [
      { index: true, element: <MethodChooserScreen /> },
      { path: 'capture/:kind', element: <CaptureScreen /> },
      { path: 'confirm', element: <ConfirmDetailsScreen /> },
      { path: 'manual', element: <ManualEntryScreen /> },
      { path: 'result', element: <ResultScreen /> },
      { path: 'bill-results', element: <BillResultsScreen /> },
    ],
  },
];
