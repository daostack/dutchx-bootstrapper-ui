import { EventAggregator } from 'aurelia-event-aggregator';
import { PLATFORM } from 'aurelia-pal';
import { BindingSignaler } from 'aurelia-templating-resources';
import { App } from '../../src/app';

class RouterStub {
  public routes;

  public configure(handler) {
    handler(this);
  }

  public map(routes) {
    this.routes = routes;
  }

  public fallbackRoute(route: string) { return null; }
}

describe('the App module', () => {
  let app: App;
  let mockedRouter: any;

  beforeEach(() => {
    mockedRouter = new RouterStub();

    let fakeWeb3Service = {
      isConnected: true,
      defaultAccount: {},
    };

    let fakeAppConfigService = {
      get: (name: string): string => '',
    };

    app = new App(
      fakeWeb3Service as any,
      {} as BindingSignaler,
      {} as EventAggregator,
      fakeAppConfigService as any);
    app.configureRouter(mockedRouter, mockedRouter);
  });

  it('contains a router property', () => {
    expect(app.router).toBeDefined();
  });

  it('configures the router title', () => {
    expect(app.router.title).toEqual('DutchX Initializer');
  });

  it('should have a dashboard route', () => {
    expect(app.router.routes).toContainEqual(
    { route: ['dashboard/:address?'],
      name: 'dashboard',
      moduleId: PLATFORM.moduleName('./organizations/dashboard'),
      nav: false,
      title: 'Dashboard',
    });
  });
});
