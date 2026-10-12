// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { appDestination, isLoginApp, readLastLoginApp, saveLastLoginApp } from './loginApps';

describe('appDestination', () => {
  it('pos keeps the usual landing for every role', () => {
    expect(appDestination('pos', 'admin', 0)).toEqual({ route: '/dashboard', granted: true });
    expect(appDestination('pos', 'pos', 7)).toEqual({ route: '/rewards-dashboard/7', granted: true });
  });

  it('smartloans: borrower/lender own dashboards, staff with loans access the loans page', () => {
    expect(appDestination('smartloans', 'borrower', 7)).toEqual({ route: '/client-dashboard/7', granted: true });
    expect(appDestination('smartloans', 'lender', 7)).toEqual({ route: '/lender-dashboard/7', granted: true });
    expect(appDestination('smartloans', 'admin', 0)).toEqual({ route: '/loans', granted: true });
  });

  it('smartloans without access falls back to the normal home, flagged as not granted', () => {
    expect(appDestination('smartloans', 'employee', 0)).toEqual({ route: '/dashboard', granted: false });
  });

  it('arcade needs the arcade feature', () => {
    expect(appDestination('arcade', 'employee', 0)).toEqual({ route: '/arcade', granted: true });
  });

  it('rewards: staff panel for staff, own dashboard for a customer, else the home', () => {
    expect(appDestination('rewards', 'admin', 0)).toEqual({ route: '/rewards', granted: true });
    expect(appDestination('rewards', 'pos', 7)).toEqual({ route: '/rewards-dashboard/7', granted: true });
    expect(appDestination('rewards', 'borrower', 7)).toEqual({ route: '/client-dashboard/7', granted: false });
  });
});

describe('last app memory', () => {
  it('only accepts known apps and defaults to pos', () => {
    expect(isLoginApp('arcade')).toBe(true);
    expect(isLoginApp('nope')).toBe(false);
    localStorage.removeItem('login.app');
    expect(readLastLoginApp()).toBe('pos');
    saveLastLoginApp('rewards');
    expect(readLastLoginApp()).toBe('rewards');
    localStorage.setItem('login.app', 'garbage');
    expect(readLastLoginApp()).toBe('pos');
  });
});
