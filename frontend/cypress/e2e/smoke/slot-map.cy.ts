describe('J15 — visual slot map', { retries: { runMode: 0 } }, () => {
  it('opens slot map, shows floor grid, and opens slot detail drawer', () => {
    cy.setupParkingSmokeData().then((data) => {
      cy.loginWithUser(data.admin);
      cy.visit(`/parking-lots/${data.lotId}/slot-map`);

      cy.contains('h1', /visual slot map/i).should('be.visible');
      cy.contains('Legend').should('be.visible');
      cy.contains('button', new RegExp(`${data.slotNumber}, available, car`, 'i')).click();
      cy.contains('h2', new RegExp(`slot ${data.slotNumber}`, 'i')).should('be.visible');
    });
  });
});