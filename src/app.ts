import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import { Router, RouterConfiguration } from 'aurelia-router';
import { BindingSignaler } from 'aurelia-templating-resources';
import '../static/styles.scss';

@autoinject
export class App {

  public static timezone: any;

  public static hasDashboard(schemeName: string): boolean {
    return App.schemeDashboards.indexOf(schemeName) !== -1;
  }

  private static schemeDashboards = [
    'Auction4Reputation',
    'ExternalLocking4Reputation',
    'LockingEth4Reputation',
    'LockingToken4Reputation',
    'DaoStorytelling',
  ];

  /**
   * public for tests
   */
  public router: Router;

  private intervalId: any;

  constructor(
    private signaler: BindingSignaler,
    private eventAggregator: EventAggregator
  ) {
  }

  public attached() {
    ($('body') as any)
      .bootstrapMaterialDesign({ global: { label: { className: 'bmd-label-floating' } } });

  }

  private configureRouter(config: RouterConfiguration, router: Router) {

    config.title = 'dxDAO';
    config.options.pushState = true;
    config.options.root = '/';
    config.map([
      {
        moduleId: PLATFORM.moduleName('./landing'),
        name: 'landing',
        nav: false,
        route: ['', '/', 'landing', 'home'],
        title: '',
      },
    ]);

    config.fallbackRoute('');

    this.router = router;
  }
}
