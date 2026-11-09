// @vitest-environment jsdom
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RewardsDashboardPage from './RewardsDashboardPage';

const session = vi.hoisted(() => ({ roleCode: 'admin', clientId: 0 }));

vi.mock('../../contexts/UserContext', () => ({ useUser: () => session }));
vi.mock('./RewardsDashboard/RewardsDashboardView', () => ({ default: () => <div>rewards view</div> }));

const Where: React.FC = () => <div data-testid="path">{useLocation().pathname}</div>;

const open = (path: string) => render(
  <MemoryRouter initialEntries={[path]}>
    <Route exact path="/rewards-dashboard/:clientId" component={RewardsDashboardPage} />
    <Where />
  </MemoryRouter>,
);

describe('RewardsDashboardPage', () => {
  beforeEach(() => { session.roleCode = 'admin'; session.clientId = 0; });
  afterEach(cleanup);

  it.each(['admin', 'manager'])('sends %s looking up a client to /client-pos', (roleCode) => {
    session.roleCode = roleCode;
    open('/rewards-dashboard/2242');
    expect(screen.getByTestId('path').textContent).toBe('/client-pos/2242');
  });

  it('keeps a customer on their own home', () => {
    session.roleCode = 'pos';
    session.clientId = 2242;
    open('/rewards-dashboard/2242');
    expect(screen.getByText('rewards view')).toBeTruthy();
    expect(screen.getByTestId('path').textContent).toBe('/rewards-dashboard/2242');
  });

  it('never sends a customer to /client-pos, even on a foreign id', () => {
    session.roleCode = 'pos';
    session.clientId = 7;
    open('/rewards-dashboard/2242');
    expect(screen.getByText('rewards view')).toBeTruthy();
  });

  it('keeps staff on their own rewards', () => {
    session.clientId = 2242;
    open('/rewards-dashboard/2242');
    expect(screen.getByText('rewards view')).toBeTruthy();
  });

  it('keeps staff without the clients feature, who could not open /client-pos', () => {
    session.roleCode = 'employee';
    open('/rewards-dashboard/2242');
    expect(screen.getByText('rewards view')).toBeTruthy();
  });
});
