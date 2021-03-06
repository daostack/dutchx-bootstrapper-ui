import { EventAggregator } from 'aurelia-event-aggregator';
import { PLATFORM } from 'aurelia-pal';
import { BindingSignaler } from 'aurelia-templating-resources';
import { App } from '../../src/app';

class RouterStub {
  public routes;

  public options: any = {};

  public configure(handler) {
    handler(this);
  }

  public map(routes) {
    this.routes = routes;
  }

  public fallbackRoute(_route: string) { return null; }
}

describe('the App module', () => {
  let app: App;
  let mockedRouter: any;

  beforeEach(() => {
    mockedRouter = new RouterStub();

    const fakeWeb3Service = {
      defaultAccount: {},
      isConnected: true,
    };

    const fakeAppConfigService = {
      get: (_name: string): string => '',
    };

    app = new App(
      fakeWeb3Service as any,
      {} as BindingSignaler,
      {} as EventAggregator);
    (app as any).configureRouter(mockedRouter, mockedRouter);
  });

  it('contains a router property', () => {
    expect(app.router).toBeDefined();
  });

  it('configures the router title', () => {
    expect(app.router.title).toEqual('dxDAO');
  });

  it('should have a dashboard route', () => {
    expect(app.router.routes).toContainEqual({
      moduleId: PLATFORM.moduleName('./organizations/dashboard'),
      name: 'stake-for-your-vote',
      nav: false,
      route: ['stake-for-your-vote'],
      title: 'Stake for Your Vote',
    });
  });
});
