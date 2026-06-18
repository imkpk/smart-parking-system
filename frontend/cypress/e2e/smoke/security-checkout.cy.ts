describe('J6 — security check-out', { retries: { runMode: 0 } }, () => {
  it('checks out an active session and completes the event', () => {
    cy.setupParkingSmokeData()
      .then((data) => cy.createBookingViaApi(data))
      .then((data) => cy.checkInBookingViaApi(data))
      .then((data) => {
        cy.intercept('POST', '**/api/parking-events/check-out').as('checkOut');
        cy.intercept('GET', '**/api/parking-events/active**').as('activeEvents');

        cy.loginWithUser(data.security);
        cy.visit('/parking-events');

        cy.wait('@activeEvents');
        cy.contains('[role="row"]', data.vehiclePlate, { timeout: 15000 })
          .should('be.visible')
          .as('activeEventRow');
        cy.get('.MuiDataGrid-virtualScroller').scrollTo('right');
        cy.get('@activeEventRow')
          .find('[data-field="actions"] button')
          .contains('Check out', { timeout: 15000 })
          .click();

        cy.contains('[role="dialog"]', 'Confirm Check-out').should('be.visible');
        cy.contains('[role="dialog"]', 'Confirm Check-out').within(() => {
          cy.contains('button', /^Check Out$/).click();
        });

        cy.wait('@checkOut').its('response.statusCode').should('eq', 201);
        cy.contains('Parking event checked out.').should('be.visible');
        cy.contains('[role="dialog"]', 'Check-out Result').should('be.visible');
        cy.contains('[role="dialog"]', 'Payment Initiated').should('be.visible');
      });
  });
});