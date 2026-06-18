describe('J14 — auth guard and logout', () => {
  it('redirects unauthenticated users to login', () => {
    cy.visit('/bookings');
    cy.url().should('include', '/login');
    cy.contains('Sign in').should('be.visible');
  });

  it('blocks USER from admin dashboard', () => {
    cy.loginAs('USER');
    cy.visit('/admin/dashboard');
    cy.contains('You do not have access to this page.').should('be.visible');
    cy.contains('Go to dashboard').should('be.visible');
    cy.contains('Total Users').should('not.exist');
  });

  it('logs out and blocks protected routes', () => {
    cy.loginAs('USER');
    cy.visit('/vehicles');
    cy.contains('Vehicles').should('be.visible');

    cy.contains('button', 'Logout').click();
    cy.url().should('include', '/login');

    cy.visit('/vehicles');
    cy.url().should('include', '/login');
  });
});