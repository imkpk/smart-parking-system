describe('J3 — register vehicle', { retries: { runMode: 0 } }, () => {
  beforeEach(() => {
    cy.loginAs('USER');
  });

  it('creates a vehicle and shows it in the list', () => {
    cy.uniquePlate().then((plate) => {
      cy.intercept('POST', '**/api/vehicles').as('createVehicle');
      cy.intercept('GET', '**/api/vehicles/my**').as('myVehicles');

      cy.visit('/vehicles');
      cy.wait('@myVehicles');
      cy.contains('button', 'Add Vehicle').click();

      cy.get('[role="dialog"]').filter(':visible').within(() => {
        cy.contains('Add Vehicle').should('be.visible');
        cy.get('input[type="text"]').eq(0).clear().type(plate);
        cy.get('input[type="text"]').eq(1).type('E2E Motors');
        cy.get('input[type="text"]').eq(2).type('Smoke');
        cy.get('input[type="text"]').eq(3).type('Blue');
        cy.contains('button', 'Create').click();
      });

      cy.wait('@createVehicle').its('response.statusCode').should('eq', 201);
      cy.wait('@myVehicles');
      cy.contains('h2', 'Add Vehicle').should('not.exist');
      cy.get('[role="grid"]').should('be.visible');
      cy.contains('[role="row"]', plate, { timeout: 15000 }).should('be.visible');
    });
  });
});