describe('J17 — IoT gate denial', { retries: { runMode: 0 } }, () => {
  it('shows denied access attempt in IoT gate monitor', () => {
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
    });

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
    });

    cy.intercept('GET', '**/api/gates/5/detections*', {
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
    });

    cy.intercept('GET', '**/api/gates/5/access-attempts*', {
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

    cy.contains(/iot gate monitor/i).should('be.visible');
    cy.wait('@gates');
    cy.wait('@attempts');

    cy.contains(/latest access attempts/i).should('be.visible');
    cy.get('[role="grid"]').should('contain', 'KA99ZZ9999');
    cy.get('[role="grid"]').should('contain', 'Denied');
    cy.get('[role="grid"]').should('contain', 'NO_ACTIVE_BOOKING');
  });
});