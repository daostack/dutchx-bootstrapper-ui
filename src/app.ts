import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import { Router, RouterConfiguration } from 'aurelia-router';
import { BindingSignaler } from 'aurelia-templating-resources';
import { Utils } from 'services/utils';
import '../static/styles.scss';
import { Web3Service } from './services/Web3Service';

@autoinject
export class App {

  public static timezone: any;

  public static hasDashboard(schemeName: string): boolean {
    return App.schemeDashboards.indexOf(schemeName) !== -1;
  }

  private static schemeDashboards = [
    'Auction4Reputation',
    'ContributionReward',
    'ExternalLocking4Reputation',
    'GenesisProtocol',
    'GlobalConstraintRegistrar',
    'LockingEth4Reputation',
    'LockingToken4Reputation',
    'NonArc',
    'SchemeRegistrar',
    'UpgradeScheme',
  ];

  /**
   * public for tests
   */
  public router: Router;

  private intervalId: any;

  constructor(
      private web3Service: Web3Service
    , private signaler: BindingSignaler
    , private eventAggregator: EventAggregator
    , appConfig: AureliaConfiguration
  ) {
    App.timezone = appConfig.get('rootTimezone');
  }

  public activate() {
    this.intervalId = setInterval(async () => {
      this.signaler.signal('secondPassed');
      if (this.web3Service.isConnected) {
        const blockDate = await Utils.lastBlockDate(this.web3Service.web3);
        this.eventAggregator.publish('secondPassed', blockDate);
      }
    }, 1000);
  }

  public attached() {
    ($('body') as any)
      /* override the body style set in the splash screen */
      // .css({
      //   "color": "black",
      //   "background-color": "white"
      // })
      .bootstrapMaterialDesign({ global: { label: { className: 'bmd-label-floating' } } });

  }

  public deactivate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private configureRouter(config: RouterConfiguration, router: Router) {

    config.title = 'DutchX Initializer';

    /**
     * first set the landing page.
     * it is possible to be connected but have the wrong chain.
     */
    config.map([
      {
        moduleId: PLATFORM.moduleName('./landing'),
        name: 'landing',
        nav: false,
        route: ['', 'landing'],
        title: 'Home',
      },
      {
        moduleId: PLATFORM.moduleName('./organizations/dashboard'),
        name: 'dashboard',
        nav: false,
        // 'address' will be present in the object passed to the 'activate' method of the viewmodel
        // DutchX: set address to be optional, and this page as the default (instead of Home)
        route: ['dashboard/:address?'],
        title: 'Dashboard',
      }
      , {
        moduleId: PLATFORM.moduleName('./txInfo/txInfo'),
        // 'txHash' will be present in the object passed to the 'activate' method of the viewmodel
        name: 'txInfo',
        nav: false,
        route: ['txInfo/:txHash'],
        title: 'Transaction Information',
      },
    ]);

    config.fallbackRoute('');

    this.router = router;
  }
}
