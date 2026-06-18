describe('J5 — security check-in', { retries: { runMode: 0 } }, () => {
  it('checks in a booking and shows an active event', () => {
    cy.setupParkingSmokeData()
      .then((data) => cy.createBookingViaApi(data))
      .then((data) => {
        cy.intercept('POST', '**/api/parking-events/check-in').as('checkIn');

        cy.loginWithUser(data.security);
        cy.visit('/parking-events');

        cy.get('label').contains('Booking Code').parent().find('input').type(data.bookingCode);
        cy.contains('button', 'Check In').click();

        cy.wait('@checkIn').its('response.statusCode').should('be.oneOf', [200, 201]);
        cy.contains(/Checked in booking/).should('be.visible');
        cy.get('[role="grid"]').should('be.visible');
        cy.contains('[role="row"]', data.vehiclePlate).should('be.visible');
        cy.get('[role="grid"]').should('contain', 'SES-');
      });
  });
});