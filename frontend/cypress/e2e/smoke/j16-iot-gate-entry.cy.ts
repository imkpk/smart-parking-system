describe('J16 — IoT gate entry (granted)', { retries: { runMode: 0 } }, () => {
  it('shows granted access attempt in IoT gate monitor', () => {
    cy.loginAs('SECURITY');
    cy.visit('/security/gate');

    cy.intercept('GET', '**/api/parking-lots', {
      statusCode: 200,
      body: [
        {
          id: 1,
          name: 'Central Garage',
          type: 'MALL',
          isActive: true,
        },
      ],
    }).as('parkingLots');

    cy.intercept('GET', '**/api/parking-lots/1/gates', {
      statusCode: 200,
      body: [
        {
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
        },
      ],
    }).as('gates');

    cy.intercept('GET', '**/api/gates/5/live', {
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

    cy.intercept('GET', '**/api/gates/5/detections*', {
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

    cy.intercept('GET', '**/api/gates/5/access-attempts*', {
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

    cy.contains(/iot gate monitor/i).should('be.visible');
    cy.wait('@gates');
    cy.wait('@gateLive');
    cy.wait('@attempts');

    cy.contains(/latest access attempts/i).should('be.visible');
    cy.get('[role="grid"]').should('contain', 'KA01AB1234');
    cy.get('[role="grid"]').should('contain', 'Granted');
  });
});