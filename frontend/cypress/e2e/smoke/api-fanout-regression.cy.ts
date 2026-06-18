describe('API fan-out regression', () => {
  beforeEach(() => {
    cy.intercept('GET', /\/api\/parking-lots\/\d+\/slots(\?|$)/).as('slotsFanout');
  });

  it('does not fan out slots API on Bookings initial load', () => {
    cy.loginAs('USER');
    cy.visit('/bookings');
    cy.contains('Bookings').should('be.visible');
    cy.get('@slotsFanout.all').should('have.length', 0);
  });

  it('does not fan out slots API on Parking Events initial load', () => {
    cy.loginAs('SECURITY');
    cy.visit('/parking-events');
    cy.contains('Parking Events').should('be.visible');
    cy.get('@slotsFanout.all').should('have.length', 0);
  });
});