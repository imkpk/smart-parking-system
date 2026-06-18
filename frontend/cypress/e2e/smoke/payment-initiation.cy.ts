describe('J8 — payment initiation (stubbed)', { retries: { runMode: 0 } }, () => {
  it('shows initiated payment after checkout without real Razorpay', () => {
    cy.setupParkingSmokeData()
      .then((data) => cy.createBookingViaApi(data))
      .then((data) => cy.checkInBookingViaApi(data))
      .then((data) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.env('apiBaseUrl')}/parking-events/check-out`,
          headers: { Authorization: `Bearer ${data.security.token}` },
          body: { parkingEventId: data.parkingEventId },
        });

        cy.intercept('GET', '**/api/payments/user/**').as('userPayments');

        cy.loginWithUser(data.user);
        cy.visit('/payments');

        cy.wait('@userPayments');
        cy.get('[role="grid"]').should('be.visible');
        cy.get('[role="row"]').contains(data.vehiclePlate).should('be.visible');
        cy.get('[role="row"]').contains(/PAY-|INR/).should('be.visible');
      });
  });
});