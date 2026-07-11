describe('J17 — IoT gate denial UI smoke', { retries: { runMode: 0 } }, () => {
  it('shows denied access attempt in IoT gate monitor', () => {
    cy.setupIotGateMonitorMocks('denied');
    cy.visitWithMockedSecuritySession('/security/gate');

    cy.wait('@authMe');
    cy.wait('@parkingLots');
    cy.wait('@gates');
    cy.wait('@gateLive');
    cy.wait('@attempts');

    cy.contains(/iot gate monitor/i).should('be.visible');
    cy.contains(/latest access attempts/i).should('be.visible');
    cy.get('[role="grid"]').should('contain', 'KA99ZZ9999');
    cy.get('[role="grid"]').should('contain', 'Denied');
    cy.get('[role="grid"]').should('contain', 'NO_ACTIVE_BOOKING');
  });
});