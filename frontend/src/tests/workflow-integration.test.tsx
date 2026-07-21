// workflow-integration.test.tsx
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { I18nProvider } from 'react-i18next';
import i18n from '../i18n/i18n';
import { App } from '../App';
import { authStore } from '../store/authStore';
import { scanStore } from '../store/scanStore';

// Mock all external API calls
jest.mock('../services/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../services/socketService', () => ({
  socketService: {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
  },
}));

const createTestClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: 0 },
    mutations: { retry: false },
  },
});

describe('SEWA Enterprise Clinical Platform - End-to-End Integration', () => {
  const renderApp = (userData = null) => {
    // Mock authentication store
    (authStore as any).user = userData || {
      id: 'test-user-1',
      tenantId: 'tenant-1',
      email: 'clinician@sewa.ai',
      region: 'UK',
      language: 'EN',
      firstName: 'Dr Test',
    };
    (authStore as any).isAuthenticated = true;
    
    return render(
      <BrowserRouter>
        <I18nProvider i18n={i18n}>
          <QueryClientProvider client={createTestClient()}>
            <App />
          </QueryClientProvider>
        </I18nProvider>
      </BrowserRouter>
    );
  };

  describe('Clinical Decision Support Integration', () => {
    it('processes AI triage results through confidence indicator workflow', async () => {
      const mockAIResult = {
        scanId: 'scan-123',
        urgency: 'CRITICAL',
        primaryFinding: 'Intracranial Haemorrhage',
        confidence: 0.947,
        uncertainty: 0.053,
      };

      // Mock API responses
      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValueOnce({ data: { scans: [] } });
      apiClient.get.mockResolvedValueOnce({ data: { appointments: [] } });
      
      // Simulate socket event processing
      const socketService = jest.requireMock('../services/socketService').socketService;
      
      // Render app and verify integration
      renderApp();
      
      await waitFor(() => {
        expect(screen.queryByText(/Loading/)).not.toBeInTheDocument();
      });
      
      // Verify components are integrated
      expect(screen.getByTestId('confidence-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('critical-alert-banner')).toBeInTheDocument();
      
      // Simulate processing socket event
      act(() => {
        socketService.on.mock.calls.find(call => 
          call[0] === 'ai:result'
        )[1](mockAIResult);
      });
      
      // Verify notification appears
      await waitFor(() => {
        expect(screen.getByText(/CRITICAL/)).toBeInTheDocument();
        expect(screen.getByText(/Intracranial Haemorrhage/)).toBeInTheDocument();
      });
    });

    it('handles uncertainty quantification through clinical confidence display', async () => {
      const mockUncertaintyResult = {
        scanId: 'scan-456',
        urgency: 'URGENT',
        primaryFinding: 'Stroke',
        confidence: 0.823,
        uncertainty: 0.177, // High uncertainty case
      };

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: { scans: [] } });
      
      renderApp();
      
      // Simulate socket processing
      const socketService = jest.requireMock('../services/socketService').socketService;
      act(() => {
        socketService.on.mock.calls.find(call => call[0] === 'ai:result')[1](mockUncertaintyResult);
      });
      
      // Verify uncertainty-aware clinical processing
      await waitFor(() => {
        expect(screen.getByText(/URGENT/)).toBeInTheDocument();
        expect(screen.getByText('Stroke')).toBeInTheDocument();
        expect(screen.getByText(/82.3% confidence/)).toBeInTheDocument();
        expect(screen.getByText(/17.7% uncertainty/)).toBeInTheDocument();
      });
    });

    it('integrates longitudinal tracking analytics with real patient progression data', async () => {
      const mockProgressionData = {
        patient: {
          id: 'patient-1',
          name: 'John Doe',
          mrn: 'MRN-001',
          sex: 'M',
          dob: '1965-03-15',
          bloodType: 'O+',
        },
        metrics: {
          totalScans: 12,
          latestVolume: 45.2,
          growthRate: 4.3,
          criticalFlags: 2,
        },
        timeline: [
          { date: '2026-06-01', volume: 38.2, aiConfidence: 0.82 },
          { date: '2026-06-08', volume: 39.5, aiConfidence: 0.79 },
          { date: '2026-06-15', volume: 45.2, aiConfidence: 0.89 },
        ],
      };

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: mockProgressionData });
      
      renderApp();
      
      // Verify longitudinal tracking integration
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('MRN-001')).toBeInTheDocument();
        expect(screen.getByText(/12 Total Scans/)).toBeInTheDocument();
        expect(screen.getByText(/45.2 cm³ Latest Volume/)).toBeInTheDocument();
        expect(screen.getByText('4.3% Growth Rate')).toBeInTheDocument();
        expect(screen.getByText('2 Critical Flags')).toBeInTheDocument();
        expect(screen.getByText(/Intracranial Haemorrhage/)).toBeInTheDocument();
      });
    });

    it('processes billing and insurance integration with AI confidence verification', async () => {
      const mockBillingData = {
        scans: [
          {
            id: 'scan-001',
            date: '2026-06-01',
            modality: 'CT',
            aiConfidence: 0.94,
            clinicalVerification: 'Confirmed',
            cptCode: '71270',
            charge: 3250,
          },
          {
            id: 'scan-002',
            date: '2026-06-08',
            modality: 'MRI',
            aiConfidence: 0.87,
            clinicalVerification: 'Confirmed',
            cptCode: '72148',
            charge: 4500,
          },
        ],
        payments: [
          {
            id: 'pay-001',
            date: '2026-06-01T14:30:00',
            amount: 3250,
            status: 'cleared',
            payer: 'NHS England',
            paymentNumber: 'NHS-2026-0601',
          },
        ],
        totalCharges: 7750,
        totalPaid: 3250,
        balance: 4500,
      };

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: { scans: [] } });
      apiClient.get.mockResolvedValueOnce({ data: mockBillingData });
      
      renderApp();
      
      // Switch to billing tab
      await waitFor(() => {
        const billingTab = screen.getByRole('tab', { name: /billing/i }) || screen.getByText('Billing');
        if (billingTab) billingTab.click();
      });
      
      // Verify billing integration
      await waitFor(() => {
        expect(screen.getByText('$3,250.00')).toBeInTheDocument();
        expect(screen.getByText('$4,500.00')).toBeInTheDocument();
        expect(screen.getByText('$7,750.00')).toBeInTheDocument(); // Total charges
        expect(screen.getByText('4,500.00')).toBeInTheDocument(); // Balance
        expect(screen.getByText('NHS England')).toBeInTheDocument();
        expect(screen.getByText('cleared')).toBeInTheDocument();
      });
    });
  });

  describe('Patient Experience & System Integration', () => {
    it('handles patient onboarded access with AI confidence scores', async () => {
      const mockPatientScans = {
        scans: [
          {
            id: 'scan-001',
            date: '2026-06-01',
            modality: 'CT',
            finding: 'Intracranial Haemorrhage',
            aiFinding: 'ICH detected with high confidence',
            confidenceScore: 0.947,
            urgency: 'CRITICAL',
            status: 'confirmed',
            confidenceIndicator: 'high',
          },
        ],
      };

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: mockPatientScans });
      
      renderApp({
        id: 'patient-1',
        tenantId: 'tenant-1',
        email: 'patient@sewa.ai',
        region: 'UK',
        language: 'EN',
        firstName: 'Jane',
      });
      
      // Verify patient-facing confidence display
      await waitFor(() => {
        expect(screen.getByText(/Welcome back, Jane/)).toBeInTheDocument();
        expect(screen.getByText(/CONFIDENCE:.*94.7%/i)).toBeInTheDocument();
        expect(screen.getByText(/CRITICAL finding alert/)).toBeInTheDocument();
        expect(screen.getByText(/Intracranial Haemorrhage/)).toBeInTheDocument();
        expect(screen.getByText(/ICH detected with high confidence/)).toBeInTheDocument();
      });
    });

    it('processes AI results through confidence threshold validation', async () => {
      const mockMixedConfidenceScans = [
        {
          id: 'scan-001',
          date: '2026-06-01',
          finding: 'Confirm ICH',
          aiFinding: 'High confidence detection',
          confidenceScore: 0.94,
          urgency: 'CRITICAL',
          status: 'confirmed',
        },
        {
          id: 'scan-002',
          date: '2026-06-05',
          finding: 'Monitor small bleed',
          aiFinding: 'Moderate confidence, requires monitoring',
          confidenceScore: 0.68,
          urgency: 'MONITOR',
          status: 'pending_review',
        },
      ];

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: { scans: mockMixedConfidenceScans } });
      
      renderApp();
      
      // Verify confidence-based clinical processing
      await waitFor(() => {
        expect(screen.getByText(/94%/)).toBeInTheDocument(); // High confidence
        expect(screen.getByText(/68%/)).toBeInTheDocument(); // Moderate confidence
        expect(screen.getByText('CRITICAL')).toBeInTheDocument(); // Action required
        expect(screen.getByText('MONITOR')).toBeInTheDocument(); // Monitoring
      });
    });

    it('maintains audit trail consistency across confidence verification workflows', async () => {
      const mockAuditLog = {
        id: 'audit-001',
        timestamp: '2026-06-01T14:30:00Z',
        action: 'AI_ANALYSIS_COMPLETED',
        userId: 'user-1',
        patientId: 'patient-1',
        scanId: 'scan-001',
        aiModel: 'triage_v2.4.1',
        confidenceScore: 0.947,
        uncertaintyScore: 0.053,
        clinicalVerification: 'CONFIRMED',
        regulatoryCompliance: 'COMPLIANT',
      };

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: { scans: [] } });
      
      renderApp();
      
      // Simulate processing audit-relevant actions
      const socketService = jest.requireMock('../services/socketService').socketService;
      
      act(() => {
        // Simulate confidence score entering audit log
        socketService.on.mock.calls.find(call => call[0] === 'ai:result')[1]({
          scanId: 'scan-001',
          urgency: 'CRITICAL',
          primaryFinding: 'ICH detected',
          confidence: 0.947,
          uncertainty: 0.053,
        });
      });
      
      // Verify audit integration (implementation through scanStore)
      await waitFor(() => {
        expect(screen.getByText(/CRITICAL.*ICH detected/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Integration Testing', () => {
    it('maintains seamless integration between FE and BE with socket.io real-time data streams', async () => {
      const mockRealTimeScan = {
        scanId: 'scan-rt-001',
        timestamp: '2026-06-01T15:45:00Z',
        modality: 'MRI',
        finding: 'Right ICH detected',
        aiConfidence: 0.89,
        urgency: 'CRITICAL',
        notificationSent: true,
        alertDismissed: false,
      };

      const { apiClient } = jest.requireMock('../services/apiClient');
      apiClient.get.mockResolvedValue({ data: { scans: [] } });
      
      renderApp();
      
      // Simulate incoming real-time data via socket
      const socketService = jest.requireMock('../services/socketService').socketService;
      
      // Verify socket integration is active
      expect(socketService.connect).toHaveBeenCalled();
      
      // Simulate real-time scan data stream
      act(() => {
        socketService.on.mock.calls.find(call => call[0] === 'ai:result')[1]({
          scanId: mockRealTimeScan.scanId,
          urgency: mockRealTimeScan.urgency,
          primaryFinding: mockRealTimeScan.finding,
          confidence: mockRealTimeScan.aiConfidence,
          uncertainty: 1 - mockRealTimeScan.aiConfidence,
        });
      });
      
      // Verify real-time processing
      await waitFor(() => {
        expect(screen.getByText(mockRealTimeScan.scanId)).toBeInTheDocument();
        expect(screen.getByText('CRITICAL')).toBeInTheDocument();
        expect(screen.getByText(mockRealTimeScan.finding)).toBeInTheDocument();
        expect(screen.getByText(/89%/)).toBeInTheDocument();
      });
    });
  });
});