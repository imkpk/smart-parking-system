describe('J6 — security check-out', { retries: { runMode: 0 } }, () => {
  it('checks out an active session and completes the event', () => {
    cy.setupParkingSmokeData()
      .then((data) => cy.createBookingViaApi(data))
      .then((data) => cy.checkInBookingViaApi(data))
      .then((data) => {
        cy.intercept('POST', '**/api/parking-events/check-out').as('checkOut');

        cy.loginWithUser(data.security);
        cy.visit('/parking-events');

        cy.contains('[role="row"]', data.vehiclePlate).should('be.visible');
        cy.get('.MuiDataGrid-virtualScroller').scrollTo('right');
        cy.contains('button', 'Check out', { timeout: 15000 }).click();

        cy.get('[role="dialog"]').contains('Confirm Check-out').should('be.visible');
        cy.contains('button', /^Check Out$/).click();

        cy.wait('@checkOut').its('response.statusCode').should('eq', 201);
        cy.contains('Parking event checked out.').should('be.visible');
        cy.contains('h2', 'Check-out Result').should('be.visible');
        cy.contains('Payment Initiated').should('be.visible');
      });
  });
});