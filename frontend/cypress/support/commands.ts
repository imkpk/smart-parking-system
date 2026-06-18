type E2ERole = 'USER' | 'ADMIN' | 'SECURITY';

interface RegisteredUser {
  email: string;
  password: string;
  role: E2ERole;
  name: string;
}

const TOKEN_KEY = 'smartParkingToken';

function apiBaseUrl(): string {
  return Cypress.env('apiBaseUrl') as string;
}

function registerUser(role: E2ERole): Cypress.Chainable<RegisteredUser> {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `e2e-${stamp}@example.com`;
  const password = 'password123';
  const name = `E2E ${role} ${stamp}`;

  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/auth/register`,
      body: { name, email, password, role },
    })
    .then(() => ({ email, password, role, name }));
}

function loginViaUi(user: RegisteredUser): void {
  cy.visit('/login');
  cy.get('input[type="email"]').clear().type(user.email);
  cy.get('input[type="password"]').clear().type(user.password);
  cy.contains('button', 'Sign in').click();
}

Cypress.Commands.add('uniquePlate', () => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return cy.wrap(`E2E${stamp}`.slice(0, 12));
});

Cypress.Commands.add('uniqueEmail', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return cy.wrap(`e2e-${stamp}@example.com`);
});

Cypress.Commands.add('registerViaApi', (role: E2ERole = 'USER') => {
  return registerUser(role);
});

Cypress.Commands.add('loginAs', (role: E2ERole = 'USER') => {
  const sessionId = `login-${role}`;

  cy.session(
    sessionId,
    () => {
      registerUser(role).then((user) => {
        loginViaUi(user);
        cy.url().should('include', roleHomePath(role));
      });
    },
    {
      validate() {
        cy.window().then((win) => {
          const token = win.localStorage.getItem(TOKEN_KEY);
          expect(token, 'auth token present').to.be.a('string').and.not.be.empty;
        });
      },
    },
  );
});

Cypress.Commands.add('logout', () => {
  cy.contains('button', 'Logout').click();
  cy.url().should('include', '/login');
});

function roleHomePath(role: E2ERole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'SECURITY':
      return '/security/dashboard';
    default:
      return '/user/dashboard';
  }
}

declare global {
  namespace Cypress {
    interface Chainable {
      uniquePlate(): Chainable<string>;
      uniqueEmail(): Chainable<string>;
      registerViaApi(role?: E2ERole): Chainable<RegisteredUser>;
      loginAs(role?: E2ERole): Chainable<void>;
      logout(): Chainable<void>;
    }
  }
}

export {};