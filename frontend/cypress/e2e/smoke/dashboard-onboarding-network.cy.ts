describe('Dashboard onboarding network', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/dashboard/onboarding-status').as('onboardingStatus');
    cy.intercept('GET', /\/api\/parking-lots\/\d+\/floors(\?|$)/).as('lotFloors');
    cy.intercept('GET', /\/api\/parking-lots\/\d+\/slots(\?|$)/).as('lotSlots');
  });

  it('uses onboarding-status instead of per-lot floors/slots fan-out', () => {
    cy.loginAs('ADMIN');
    cy.visit('/admin/dashboard');
    cy.contains('Dashboard').should('be.visible');

    cy.wait('@onboardingStatus');
    cy.get('@onboardingStatus.all').should('have.length.at.most', 2);
    cy.get('@lotFloors.all').should('have.length', 0);
    cy.get('@lotSlots.all').should('have.length', 0);
  });
});