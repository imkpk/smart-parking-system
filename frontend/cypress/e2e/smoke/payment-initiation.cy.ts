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
        })
          .its('status')
          .should('eq', 201);

        cy.intercept('GET', '**/api/payments/user/**').as('userPayments');
        cy.intercept('GET', '**/api/bookings/my**').as('myBookings');
        cy.intercept('GET', '**/api/vehicles/my**').as('myVehicles');

        cy.loginWithUser(data.user);
        cy.visit('/payments');

        cy.wait('@userPayments');
        cy.wait('@myBookings');
        cy.wait('@myVehicles');
        cy.get('[role="grid"]').should('be.visible');
        cy.contains('[role="row"]', /PAY-|INR/).should('be.visible');
        cy.contains('[role="row"]', data.vehiclePlate).should('be.visible');
      });
  });
});