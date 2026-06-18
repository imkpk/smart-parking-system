type E2ERole = 'USER' | 'ADMIN' | 'SECURITY';

interface RegisteredUser {
  email: string;
  password: string;
  role: E2ERole;
  name: string;
  token: string;
  userId: number;
}

export interface ParkingSmokeData {
  lotName: string;
  lotId: number;
  slotId: number;
  slotNumber: string;
  slotLabel: string;
  vehiclePlate: string;
  vehicleLabel: string;
  vehicleId: number;
  user: RegisteredUser;
  security: RegisteredUser;
  admin: RegisteredUser;
}

export interface BookingSmokeData extends ParkingSmokeData {
  bookingId: number;
  bookingCode: string;
}

export interface ActiveEventSmokeData extends BookingSmokeData {
  parkingEventId: number;
}

const TOKEN_KEY = 'smartParkingToken';

function apiBaseUrl(): string {
  return Cypress.env('apiBaseUrl') as string;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
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
    .then((response) => ({
      email,
      password,
      role,
      name,
      token: response.body.accessToken as string,
      userId: response.body.user.id as number,
    }));
}

function loginViaUi(user: Pick<RegisteredUser, 'email' | 'password' | 'role'>) {
  cy.visit('/login');
  cy.get('input[type="email"]').clear().type(user.email);
  cy.get('input[type="password"]').clear().type(user.password);
  cy.contains('button', 'Sign in').click();
  cy.url().should('include', roleHomePath(user.role));
}

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

function pickMuiOptionInDialog(optionText: string | RegExp, comboboxIndex = 0) {
  cy.get('[role="combobox"]').eq(comboboxIndex).click();
  cy.get('[role="listbox"]').should('be.visible');
  cy.get('[role="option"]').contains(optionText).click();
}

Cypress.Commands.add('uniquePlate', () => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 100000)}`;
  return cy.wrap(`E2E${stamp}`.slice(0, 12));
});

Cypress.Commands.add('uniqueEmail', () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return cy.wrap(`e2e-${stamp}@example.com`);
});

Cypress.Commands.add('registerViaApi', (role: E2ERole = 'USER') => registerUser(role));

Cypress.Commands.add('loginWithUser', (user: Pick<RegisteredUser, 'email' | 'password' | 'role'>) => {
  loginViaUi(user);
});

Cypress.Commands.add('loginAs', (role: E2ERole = 'USER') => {
  const sessionId = `login-${role}`;

  cy.session(
    sessionId,
    () => {
      registerUser(role).then((user) => {
        loginViaUi(user);
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

Cypress.Commands.add('setupParkingSmokeData', () => {
  const stamp = `${Date.now()}`;
  const lotName = `E2E Lot ${stamp}`;
  const slotNumber = `S${stamp.slice(-5)}`;
  let admin!: RegisteredUser;
  let user!: RegisteredUser;
  let security!: RegisteredUser;
  let lotId = 0;
  let slotId = 0;
  let vehicleId = 0;
  let vehiclePlate = '';

  return registerUser('ADMIN')
    .then((registeredAdmin) => {
      admin = registeredAdmin;
      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl()}/parking-lots`,
        headers: authHeaders(admin.token),
        body: { name: lotName, type: 'MALL', isActive: true, city: 'E2E City' },
      });
    })
    .then((lotResponse) => {
      lotId = lotResponse.body.id as number;
      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl()}/parking-lots/${lotId}/floors`,
        headers: authHeaders(admin.token),
        body: { name: 'Level 1', level: 1 },
      });
    })
    .then((floorResponse) => {
      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl()}/floors/${floorResponse.body.id}/slots/bulk`,
        headers: authHeaders(admin.token),
        body: { slots: [{ slotNumber, slotType: 'CAR' }] },
      });
    })
    .then((slotsResponse) => {
      slotId = slotsResponse.body[0].id as number;
      return registerUser('USER');
    })
    .then((registeredUser) => {
      user = registeredUser;
      vehiclePlate = `E2E${stamp}${Math.floor(Math.random() * 100000)}`.slice(0, 12);
      return cy.request({
        method: 'POST',
        url: `${apiBaseUrl()}/vehicles`,
        headers: authHeaders(user.token),
        body: {
          vehicleNumber: vehiclePlate,
          vehicleType: 'CAR',
          brand: 'E2E Motors',
          model: 'Smoke',
          color: 'Blue',
        },
      });
    })
    .then((vehicleResponse) => {
      vehicleId = vehicleResponse.body.id as number;
      return registerUser('SECURITY');
    })
    .then((registeredSecurity) => {
      security = registeredSecurity;
      const data: ParkingSmokeData = {
        lotName,
        lotId,
        slotId,
        slotNumber,
        slotLabel: `${slotNumber} · CAR`,
        vehiclePlate,
        vehicleLabel: `${vehiclePlate} · CAR`,
        vehicleId,
        user,
        security,
        admin,
      };
      return cy.wrap(data);
    });
});

Cypress.Commands.add('createBookingViaApi', (data: ParkingSmokeData) => {
  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/bookings`,
      headers: authHeaders(data.user.token),
      body: {
        vehicleId: data.vehicleId,
        slotId: data.slotId,
        startTime: new Date().toISOString(),
      },
    })
    .then((response) => {
      const bookingData: BookingSmokeData = {
        ...data,
        bookingId: response.body.id as number,
        bookingCode: response.body.bookingCode as string,
      };
      return cy.wrap(bookingData);
    });
});

Cypress.Commands.add('checkInBookingViaApi', (data: BookingSmokeData) => {
  return cy
    .request({
      method: 'POST',
      url: `${apiBaseUrl()}/parking-events/check-in`,
      headers: authHeaders(data.security.token),
      body: { bookingCode: data.bookingCode },
    })
    .then((response) => {
      const activeData: ActiveEventSmokeData = {
        ...data,
        parkingEventId: response.body.id as number,
      };
      return cy.wrap(activeData);
    });
});

Cypress.Commands.add('pickMuiOptionInDialog', (optionText: string | RegExp, comboboxIndex?: number) => {
  pickMuiOptionInDialog(optionText, comboboxIndex);
});

declare global {
  namespace Cypress {
    interface Chainable {
      uniquePlate(): Chainable<string>;
      uniqueEmail(): Chainable<string>;
      registerViaApi(role?: E2ERole): Chainable<RegisteredUser>;
      loginWithUser(user: Pick<RegisteredUser, 'email' | 'password' | 'role'>): Chainable<void>;
      loginAs(role?: E2ERole): Chainable<void>;
      logout(): Chainable<void>;
      setupParkingSmokeData(): Chainable<ParkingSmokeData>;
      createBookingViaApi(data: ParkingSmokeData): Chainable<BookingSmokeData>;
      checkInBookingViaApi(data: BookingSmokeData): Chainable<ActiveEventSmokeData>;
      pickMuiOptionInDialog(optionText: string | RegExp, comboboxIndex?: number): Chainable<void>;
    }
  }
}

export {};