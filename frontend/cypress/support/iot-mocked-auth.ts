import type { User } from '../../src/types/auth';

export const MOCK_SECURITY_USER: User = {
  id: 3,
  organizationId: 1,
  organization: {
    id: 1,
    name: 'Sunrise Properties',
    slug: 'default',
  },
  name: 'Mock Security Officer',
  email: 'mock-security@smartparking.demo',
  phone: null,
  role: 'SECURITY',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const MOCK_SECURITY_TOKEN = 'mock-security-token-ui-smoke-only';

const TOKEN_KEY = 'smartParkingToken';

const PARKING_LOT = {
  id: 1,
  name: 'Central Garage',
  type: 'MALL',
  isActive: true,
};

const GATE = {
  id: 5,
  parkingLotId: 1,
  externalId: 'gate-entry-1',
  name: 'Main Entry',
  direction: 'ENTRY',
  isActive: true,
  autoOpenEnabled: true,
  anprConfidenceThreshold: 0.85,
  duplicateWindowSeconds: 30,
  commandTtlSeconds: 15,
};

/** Matches dev-server relative API paths (no /api prefix) and proxied /api/* URLs. */
const API_PATH = '(?:/api)?';

export function registerAuthMocks() {
  cy.intercept('GET', new RegExp(`${API_PATH}/auth/me$`), {
    statusCode: 200,
    body: MOCK_SECURITY_USER,
  }).as('authMe');

  cy.intercept('GET', new RegExp(`${API_PATH}/organizations/current/branding$`), {
    statusCode: 200,
    body: {
      organizationId: 1,
      name: 'Sunrise Properties',
      slug: 'default',
      logoUrl: null,
      loginTitle: 'Sunrise Smart Parking',
      primaryColor: '#1565C0',
      secondaryColor: '#0D47A1',
      accentColor: '#42A5F5',
      supportEmail: 'support@sunrise-properties.demo',
    },
  }).as('branding');
}

function registerGateMonitorMocks(scenario: 'granted' | 'denied') {
  cy.intercept('GET', new RegExp(`${API_PATH}/parking-lots(?:\\?|$)`), {
    statusCode: 200,
    body: [PARKING_LOT],
  }).as('parkingLots');

  cy.intercept('GET', new RegExp(`${API_PATH}/parking-lots/1/gates(?:\\?|$)`), {
    statusCode: 200,
    body: [GATE],
  }).as('gates');

  if (scenario === 'granted') {
    cy.intercept('GET', new RegExp(`${API_PATH}/gates/5/live(?:\\?|$)`), {
      statusCode: 200,
      body: {
        gateId: 5,
        gateName: 'Main Entry',
        isActive: true,
        autoOpenEnabled: true,
        devicesOnline: 1,
        devicesTotal: 1,
        devices: [
          {
            id: 10,
            gateId: 5,
            externalDeviceId: 'rfid-1',
            name: 'RFID Reader',
            deviceType: 'RFID_READER',
            status: 'ONLINE',
            isEnabled: true,
            lastSeenAt: '2026-06-18T12:00:00.000Z',
            firmwareVersion: null,
          },
        ],
        lastDetectionAt: '2026-06-18T12:00:00.000Z',
        lastAccessAttemptAt: '2026-06-18T12:01:00.000Z',
        pendingCommands: 0,
      },
    }).as('gateLive');

    cy.intercept('GET', new RegExp(`${API_PATH}/gates/5/detections`), {
      statusCode: 200,
      body: [
        {
          id: 1,
          gateId: 5,
          deviceId: 10,
          deviceName: 'RFID Reader',
          messageId: 'msg-1',
          identifierType: 'UHF_RFID',
          identifierDisplay: '****AB12',
          confidence: null,
          occurredAt: '2026-06-18T12:00:00.000Z',
          matchedVehicleId: 3,
          matchedVehicleNumber: 'KA01AB1234',
        },
      ],
    }).as('detections');

    cy.intercept('GET', new RegExp(`${API_PATH}/gates/5/access-attempts`), {
      statusCode: 200,
      body: [
        {
          id: 1,
          attemptId: 'attempt-granted',
          gateId: 5,
          source: 'RFID',
          decision: 'GRANTED',
          reasonCode: 'BOOKING_ACTIVE',
          reasonDetail: null,
          vehicleId: 3,
          vehicleNumber: 'KA01AB1234',
          bookingId: 10,
          parkingEventId: null,
          commandId: 'cmd-1',
          createdAt: '2026-06-18T12:01:00.000Z',
        },
      ],
    }).as('attempts');
    return;
  }

  cy.intercept('GET', new RegExp(`${API_PATH}/gates/5/live(?:\\?|$)`), {
    statusCode: 200,
    body: {
      gateId: 5,
      gateName: 'Main Entry',
      isActive: true,
      autoOpenEnabled: true,
      devicesOnline: 1,
      devicesTotal: 1,
      devices: [
        {
          id: 11,
          gateId: 5,
          externalDeviceId: 'anpr-1',
          name: 'ANPR Camera',
          deviceType: 'ANPR_CAMERA',
          status: 'ONLINE',
          isEnabled: true,
          lastSeenAt: '2026-06-18T12:00:00.000Z',
          firmwareVersion: null,
        },
      ],
      lastDetectionAt: '2026-06-18T12:00:00.000Z',
      lastAccessAttemptAt: '2026-06-18T12:01:00.000Z',
      pendingCommands: 0,
    },
  }).as('gateLive');

  cy.intercept('GET', new RegExp(`${API_PATH}/gates/5/detections`), {
    statusCode: 200,
    body: [
      {
        id: 2,
        gateId: 5,
        deviceId: 11,
        deviceName: 'ANPR Camera',
        messageId: 'msg-2',
        identifierType: 'PLATE',
        identifierDisplay: 'KA99ZZ9999',
        confidence: 0.92,
        occurredAt: '2026-06-18T12:00:00.000Z',
        matchedVehicleId: null,
        matchedVehicleNumber: null,
      },
    ],
  }).as('detections');

  cy.intercept('GET', new RegExp(`${API_PATH}/gates/5/access-attempts`), {
    statusCode: 200,
    body: [
      {
        id: 2,
        attemptId: 'attempt-denied',
        gateId: 5,
        source: 'ANPR',
        decision: 'DENIED',
        reasonCode: 'NO_ACTIVE_BOOKING',
        reasonDetail: 'No confirmed booking for detected vehicle',
        vehicleId: null,
        vehicleNumber: 'KA99ZZ9999',
        bookingId: null,
        parkingEventId: null,
        commandId: null,
        createdAt: '2026-06-18T12:01:00.000Z',
      },
    ],
  }).as('attempts');
}

export function setupIotGateMonitorMocks(scenario: 'granted' | 'denied') {
  registerAuthMocks();
  registerGateMonitorMocks(scenario);
}

export function visitWithMockedSecuritySession(path: string) {
  cy.visit(path, {
    onBeforeLoad(win) {
      win.localStorage.setItem(TOKEN_KEY, MOCK_SECURITY_TOKEN);
    },
  });
}