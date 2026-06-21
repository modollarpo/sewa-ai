// SEWA AI — mobile/src/App.tsx
// React Native 0.73+ | TypeScript | TanStack Query | Zustand | FCM | Biometric
// Full clinician & patient portal with offline support, voice dictation, annotations

import React, { useEffect, useState } from 'react';
import {
  StatusBar, Platform, AppState, AppStateStatus,
  Alert, Vibration, PermissionsAndroid,
} from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import messaging, { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, EventType, Notification } from '@notifee/react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './store/authStore';
import { useOfflineStore } from './store/offlineStore';
import { useNotificationStore } from './store/notificationStore';
import { syncQueue } from './services/offlineSyncService';
import { apiClient } from './services/apiClient';

// ── Screens ────────────────────────────────────────────────────
import LoginScreen          from './screens/auth/LoginScreen';
import MFAScreen            from './screens/auth/MFAScreen';
import BiometricScreen      from './screens/auth/BiometricScreen';
import WorklistScreen       from './screens/clinician/WorklistScreen';
import ScanDetailScreen     from './screens/clinician/ScanDetailScreen';
import ReportEditorScreen   from './screens/clinician/ReportEditorScreen';
import VoiceDictationScreen from './screens/clinician/VoiceDictationScreen';
import AnnotationScreen     from './screens/clinician/AnnotationScreen';
import PatientListScreen    from './screens/doctor/PatientListScreen';
import PatientDetailScreen  from './screens/doctor/PatientDetailScreen';
import CriticalAlertsScreen from './screens/doctor/CriticalAlertsScreen';
import MyScansScreen        from './screens/patient/MyScansScreen';
import ReportViewScreen     from './screens/patient/ReportViewScreen';
import ConsentScreen        from './screens/patient/ConsentScreen';
import MessagingScreen      from './screens/patient/MessagingScreen';
import DashboardScreen      from './screens/shared/DashboardScreen';
import NotificationsScreen  from './screens/shared/NotificationsScreen';
import SettingsScreen       from './screens/shared/SettingsScreen';
import UploadScanScreen     from './screens/technician/UploadScanScreen';
import AlertHistoryScreen from './screens/shared/AlertHistoryScreen';
import WhatsNewScreen from './screens/shared/WhatsNewScreen';
import AppointmentsScreen from './screens/shared/AppointmentsScreen';
import HelpScreen from './screens/shared/HelpScreen';
import SecondOpinionsScreen from './screens/shared/SecondOpinionsScreen';
import TrainingScreen from './screens/shared/TrainingScreen';
import NotificationPreferencesScreen from './screens/shared/NotificationPreferencesScreen';
import MyReportsScreen from './screens/patient/MyReportsScreen';
import HomeScreen from './screens/patient/HomeScreen';
import PatientProfileScreen from './screens/patient/PatientProfileScreen';
import PatientScanDetailScreen from './screens/patient/PatientScanDetailScreen';
import ClinicianProfileScreen from './screens/clinician/ClinicianProfileScreen';

// ── Navigation ─────────────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ── Theme ──────────────────────────────────────────────────────
const SEWATheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary:    '#408D7B',
    background: '#05100D',
    card:       '#091A15',
    text:       '#D6EDE8',
    border:     '#1A3028',
    notification: '#C94444',
  },
};

// ── Query client ───────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      gcTime: 5 * 60 * 1000,
      networkMode: 'offlineFirst', // Feature: offline support
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

// ── Tab navigators by role ─────────────────────────────────────
function RadiologistTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#091A15', borderTopColor: '#1A3028', height: 60 },
        tabBarActiveTintColor: '#52B09A',
        tabBarInactiveTintColor: '#2E5048',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      <Tab.Screen name="Worklist"      component={WorklistScreen}       options={{ tabBarLabel: 'Worklist',      tabBarIcon: () => null }} />
      <Tab.Screen name="Dashboard"     component={DashboardScreen}      options={{ tabBarLabel: 'Dashboard',     tabBarIcon: () => null }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}  options={{ tabBarLabel: 'Alerts',        tabBarIcon: () => null }} />
      <Tab.Screen name="Settings"      component={SettingsScreen}       options={{ tabBarLabel: 'Settings',      tabBarIcon: () => null }} />
    </Tab.Navigator>
  );
}

function DoctorTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#091A15', borderTopColor: '#1A3028', height: 60 },
        tabBarActiveTintColor: '#52B09A',
        tabBarInactiveTintColor: '#2E5048',
      }}>
      <Tab.Screen name="Critical"      component={CriticalAlertsScreen} options={{ tabBarLabel: 'Alerts' }} />
      <Tab.Screen name="Patients"      component={PatientListScreen}    options={{ tabBarLabel: 'Patients' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen}  options={{ tabBarLabel: 'Inbox' }} />
      <Tab.Screen name="Settings"      component={SettingsScreen}       options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#091A15', borderTopColor: '#1A3028', height: 60 },
        tabBarActiveTintColor: '#52B09A',
        tabBarInactiveTintColor: '#2E5048',
      }}>
      <Tab.Screen name="Home"         component={HomeScreen}         options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="MyScans"       component={MyScansScreen}      options={{ tabBarLabel: 'My Scans' }} />
      <Tab.Screen name="MyReports"     component={MyReportsScreen}    options={{ tabBarLabel: 'Reports' }} />
      <Tab.Screen name="Messages"      component={MessagingScreen}    options={{ tabBarLabel: 'Messages' }} />
      <Tab.Screen name="Appointments"  component={AppointmentsScreen} options={{ tabBarLabel: 'Schedule' }} />
      <Tab.Screen name="Consent"       component={ConsentScreen}      options={{ tabBarLabel: 'Privacy' }} />
      <Tab.Screen name="Profile"       component={PatientProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function TechnicianTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#091A15', borderTopColor: '#1A3028', height: 60 },
        tabBarActiveTintColor: '#52B09A',
        tabBarInactiveTintColor: '#2E5048',
      }}>
      <Tab.Screen name="Upload"     component={UploadScanScreen}  options={{ tabBarLabel: 'Upload Scan' }} />
      <Tab.Screen name="Worklist"   component={WorklistScreen}    options={{ tabBarLabel: 'Queue' }} />
      <Tab.Screen name="Settings"   component={SettingsScreen}    options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}

const ROLE_TABS: Record<string, React.ComponentType> = {
  radiologist: RadiologistTabs,
  doctor:      DoctorTabs,
  patient:     PatientTabs,
  technician:  TechnicianTabs,
  admin:       RadiologistTabs,
};

// ── Root navigator ─────────────────────────────────────────────
function RootNavigator() {
  const { isAuthenticated, user } = useAuthStore();
  const [biometricDone, setBiometricDone] = useState(false);

  const RoleTabs = user ? (ROLE_TABS[user.role] ?? RadiologistTabs) : RadiologistTabs;

  if (!isAuthenticated) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="MFA"      component={MFAScreen} />
        <Stack.Screen name="Biometric"component={BiometricScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"         component={RoleTabs} />
      <Stack.Screen name="ScanDetail"   component={ScanDetailScreen}
        options={{ presentation: 'card', headerShown: true, title: 'Scan Review' }} />
      <Stack.Screen name="ReportEditor" component={ReportEditorScreen}
        options={{ presentation: 'fullScreenModal', headerShown: true, title: 'Report Editor' }} />
      <Stack.Screen name="VoiceDictation" component={VoiceDictationScreen}
        options={{ presentation: 'formSheet', headerShown: true, title: 'Voice Dictation' }} />
      <Stack.Screen name="Annotation"   component={AnnotationScreen}
        options={{ presentation: 'fullScreenModal', headerShown: true, title: 'Image Annotation' }} />
      <Stack.Screen name="PatientDetail"component={PatientDetailScreen}
        options={{ headerShown: true, title: 'Patient Record' }} />
      <Stack.Screen name="ReportView"   component={ReportViewScreen}
        options={{ headerShown: true, title: 'Report' }} />
    </Stack.Navigator>
  );
}

// ── FCM Push Notifications Setup (Feature 14) ──────────────────
async function setupFCM() {
  // Request permission (iOS)
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.warn('FCM permission not granted');
    return;
  }

  // Android notification channel
  await notifee.createChannel({
    id: 'critical',
    name: 'Critical Findings',
    importance: AndroidImportance.HIGH,
    vibration: true,
    vibrationPattern: [0, 500, 250, 500],
    sound: 'critical_alert',
  });

  await notifee.createChannel({
    id: 'general',
    name: 'General',
    importance: AndroidImportance.DEFAULT,
  });

  // Get FCM token and register with backend
  const token = await messaging().getToken();
  await apiClient.post('/users/fcm-token', { token, platform: Platform.OS });

  // Handle foreground messages
  messaging().onMessage(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    const { urgency, scanId, primaryFinding } = remoteMessage.data ?? {};

    // Show local notification via Notifee
    await notifee.displayNotification({
      title: remoteMessage.notification?.title ?? 'SEWA AI Alert',
      body: remoteMessage.notification?.body ?? '',
      android: {
        channelId: urgency === 'CRITICAL' || urgency === 'URGENT' ? 'critical' : 'general',
        importance: AndroidImportance.HIGH,
        pressAction: { id: 'open_scan', launchActivity: 'default' },
        actions: urgency !== 'CRITICAL' ? [] : [
          { title: 'Review Now', pressAction: { id: 'review_scan' } },
        ],
      },
      ios: {
        sound: urgency === 'CRITICAL' ? 'critical_alert.wav' : 'default',
        critical: urgency === 'CRITICAL',
        criticalVolume: 1.0,
      },
      data: remoteMessage.data,
    });

    if (urgency === 'CRITICAL') Vibration.vibrate([0, 500, 250, 500, 250, 500]);

    useNotificationStore.getState().addNotification({
      id: remoteMessage.messageId ?? Date.now().toString(),
      type: (urgency === 'CRITICAL' || urgency === 'URGENT') ? 'CRITICAL_ALERT' : 'SYSTEM',
      title: remoteMessage.notification?.title ?? '',
      body:  remoteMessage.notification?.body ?? '',
      data:  remoteMessage.data,
      read:  false,
    });
  });

  // Deep linking from notification tap (Feature 14)
  notifee.onForegroundEvent((event) => {
    const { type, detail } = event;
    if (type === EventType.PRESS || type === (EventType.ACTION_PRESS as any)) {
      const scanId = detail.notification?.data?.scanId;
      if (scanId) {
        // Navigate to scan detail — navigationRef.navigate('ScanDetail', { scanId })
        console.log('Navigate to scan:', scanId);
      }
    }
  });

  // Token refresh
  messaging().onTokenRefresh(async (newToken: string | null) => {
    await apiClient.post('/users/fcm-token', { token: newToken, platform: Platform.OS });
  });
}

// ── Biometric Auth Setup (Feature 2) ──────────────────────────
export async function attemptBiometricAuth(): Promise<boolean> {
  const rnBiometrics = new ReactNativeBiometrics();
  const { available, biometryType } = await rnBiometrics.isSensorAvailable();

  if (!available) return false;

  const label = biometryType === BiometryTypes.FaceID ? 'Face ID' :
                biometryType === BiometryTypes.TouchID ? 'Touch ID' : 'Fingerprint';

  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: `Sign in to SEWA AI with ${label}`,
    cancelButtonText: 'Use Password',
    fallbackPromptMessage: 'Use your password instead',
  });

  return success;
}

// ── Offline sync (Feature: Mobile offline support) ────────────
function useOfflineSync() {
  const { pendingQueue, clearQueue } = useOfflineStore();
  const appState = React.useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        // App came back to foreground — sync pending operations
        if (pendingQueue.length > 0) {
          try {
            await syncQueue(pendingQueue);
            clearQueue();
          } catch (e) {
            console.warn('Offline sync failed:', e);
          }
        }
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [pendingQueue]);
}

// ── Android permissions ────────────────────────────────────────
async function requestAndroidPermissions() {
  if (Platform.OS !== 'android') return;
  await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,        // Voice dictation
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,  // Android 13+
  ]);
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  useOfflineSync();

  useEffect(() => {
    requestAndroidPermissions();
    setupFCM().catch(console.warn);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer theme={SEWATheme}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="#05100D"
          translucent={Platform.OS === 'android'}
        />
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
