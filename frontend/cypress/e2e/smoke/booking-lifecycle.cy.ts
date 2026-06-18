describe('J4 — book slot', { retries: { runMode: 0 } }, () => {
  it('creates a booking and shows it in the list', () => {
    cy.setupParkingSmokeData().then((data) => {
      cy.createBookingViaApi(data).then((bookingData) => {
        cy.loginWithUser(bookingData.user);
        cy.visit('/bookings');

        cy.get('[role="grid"]').should('be.visible');
        cy.contains('[role="row"]', bookingData.vehiclePlate).should('be.visible');
        cy.contains('[role="row"]', bookingData.lotName).should('be.visible');
        cy.get('[role="grid"]').should('contain', bookingData.bookingCode);
      });
    });
  });
});