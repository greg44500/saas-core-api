import { describe, expect, it } from 'vitest';

import {
  composeApplicationDashboardWidgets,
  getAccessibleDashboardWidgets,
  getVisibleDashboardWidgets,
} from '@/app/application-dashboard';

function TestWidget() {
  return null;
}

function createWidget(overrides = {}) {
  return {
    id: 'test.metric',
    label: 'Test metric',
    component: TestWidget,
    slot: 'summary',
    order: 1000,
    configurable: true,
    access: {
      features: [],
      permissions: [],
    },
    ...overrides,
  };
}

describe('application dashboard registry', () => {
  it('compose les widgets métier après les widgets Core dans un ordre déterministe', () => {
    const widgets = composeApplicationDashboardWidgets([
      {
        widgets: [createWidget({ order: 350 })],
      },
    ]);

    expect(widgets.map((widget) => widget.id)).toContain('test.metric');
    expect(widgets.findIndex((widget) => widget.id === 'core.members'))
      .toBeLessThan(widgets.findIndex((widget) => widget.id === 'test.metric'));
    expect(widgets.findIndex((widget) => widget.id === 'test.metric'))
      .toBeLessThan(widgets.findIndex((widget) => widget.id === 'core.pending-invitations'));
  });

  it('refuse deux widgets portant le même identifiant', () => {
    expect(() => composeApplicationDashboardWidgets([
      { widgets: [createWidget({ id: 'core.members' })] },
    ])).toThrow('Dashboard widget ids must be unique');
  });

  it('ne rend accessible un widget que si toutes ses capabilities et permissions sont acquises', () => {
    const widget = createWidget({
      access: {
        features: ['feature-a'],
        permissions: ['permission:a'],
      },
    });

    expect(getAccessibleDashboardWidgets([widget], {
      hasFeature: () => true,
      can: () => false,
    })).toEqual([]);

    expect(getAccessibleDashboardWidgets([widget], {
      hasFeature: () => false,
      can: () => true,
    })).toEqual([]);

    expect(getAccessibleDashboardWidgets([widget], {
      hasFeature: () => true,
      can: () => true,
    })).toEqual([widget]);
  });

  it('applique une préférence de masquage uniquement après le filtre d’accès', () => {
    const accessible = createWidget({ id: 'test.accessible' });
    const inaccessible = createWidget({
      id: 'test.inaccessible',
      access: { features: ['missing'], permissions: [] },
    });
    const accessibleWidgets = getAccessibleDashboardWidgets(
      [accessible, inaccessible],
      {
        hasFeature: () => false,
        can: () => true,
      },
    );

    expect(getVisibleDashboardWidgets(
      accessibleWidgets,
      ['test.accessible', 'test.inaccessible'],
    )).toEqual([]);
  });

  it('ignore un ancien identifiant sauvegardé qui n’existe plus dans le registre', () => {
    const widget = createWidget({ id: 'test.current' });

    expect(getVisibleDashboardWidgets(
      [widget],
      ['removed-module.old-widget'],
    )).toEqual([widget]);
  });

  it('ne masque pas un widget Core déclaré non configurable', () => {
    const widget = createWidget({
      id: 'test.required-context',
      configurable: false,
    });

    expect(getVisibleDashboardWidgets(
      [widget],
      ['test.required-context'],
    )).toEqual([widget]);
  });
});
