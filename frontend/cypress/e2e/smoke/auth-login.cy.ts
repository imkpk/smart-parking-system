describe('J1 — login redirect', () => {
  it('redirects USER to user dashboard after sign in', () => {
    cy.registerViaApi('USER').then((user) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(user.email);
      cy.get('input[type="password"]').type(user.password);
      cy.contains('button', 'Sign in').click();

      cy.url().should('include', '/user/dashboard');
      cy.contains('Dashboard').should('be.visible');
    });
  });

  it('redirects ADMIN to admin dashboard after sign in', () => {
    cy.registerViaApi('ADMIN').then((user) => {
      cy.visit('/login');
      cy.get('input[type="email"]').type(user.email);
      cy.get('input[type="password"]').type(user.password);
      cy.contains('button', 'Sign in').click();

      cy.url().should('include', '/admin/dashboard');
      cy.contains('Admin Dashboard', { timeout: 15000 }).should('be.visible');
    });
  });
});