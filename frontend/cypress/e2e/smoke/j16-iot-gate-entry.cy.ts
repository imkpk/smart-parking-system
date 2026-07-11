describe('J16 — IoT gate entry UI smoke (granted)', { retries: { runMode: 0 } }, () => {
  it('shows granted access attempt in IoT gate monitor', () => {
    cy.setupIotGateMonitorMocks('granted');
    cy.visitWithMockedSecuritySession('/security/gate');

    cy.wait('@authMe');
    cy.wait('@parkingLots');
    cy.wait('@gates');
    cy.wait('@gateLive');
    cy.wait('@attempts');

    cy.contains(/iot gate monitor/i).should('be.visible');
    cy.contains(/latest access attempts/i).should('be.visible');
    cy.get('[role="grid"]').should('contain', 'KA01AB1234');
    cy.get('[role="grid"]').should('contain', 'Granted');
  });
});