import { autoinject } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';
import { PLATFORM } from 'aurelia-pal';
import { Web3Service } from "./services/Web3Service";
import { ArcService } from "./services/ArcService";
import '../static/styles.scss';
import { AureliaConfiguration } from 'aurelia-configuration';
import { BindingSignaler } from "aurelia-templating-resources";
import { runInThisContext } from "vm";
import { EventAggregator } from "aurelia-event-aggregator";
import { Utils } from "services/utils";

@autoinject
export class App {
  public static lockingPeriodEndDate: Date;
  public static lockingPeriodStartDate: Date;
  public static governanceStartDate: Date;
  private intervalId: any;

  public router: Router;

  constructor(
    private web3: Web3Service
    , private signaler: BindingSignaler
    , private arcService: ArcService
    , private eventAggregator: EventAggregator
    , appConfig: AureliaConfiguration
    , private web3Service: Web3Service
  ) {
    App.lockingPeriodStartDate = new Date(appConfig.get("lockingPeriodStartDate"));
    App.lockingPeriodEndDate = new Date(appConfig.get("lockingPeriodEndDate"));
    App.governanceStartDate = new Date(appConfig.get("governanceStartDate"));
  }

  activate() {
    this.intervalId = setInterval(async () => {
      this.signaler.signal('secondPassed');
      if (this.web3.isConnected) {
        const blockDate = await Utils.lastBlockDate(this.web3Service.web3);
        this.eventAggregator.publish("secondPassed", blockDate);
      }
    }, 1000);
  }

  deactivate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  attached() {
    (<any>$('body'))
      /* override the body style set in the splash screen */
      // .css({
      //   "color": "black",
      //   "background-color": "white"
      // })
      .bootstrapMaterialDesign({ global: { label: { className: "bmd-label-floating" } } });

  }

  configureRouter(config: RouterConfiguration, router: Router) {

    config.title = 'DutchX Initializer';

    /**
     * first set the landing page.
     * it is possible to be connected but have the wrong chain.
     */
    config.map([
      {
        route: ['', 'landing'],
        name: 'landing',
        moduleId: PLATFORM.moduleName('./landing'),
        nav: false,
        title: 'Home'
      },
      {
        // 'address' will be present in the object passed to the 'activate' method of the viewmodel
        // DutchX: set address to be optional, and this page as the default (instead of Home)
        route: ['dashboard/:address?'],
        name: 'dashboard',
        moduleId: PLATFORM.moduleName('./organizations/dashboard'),
        nav: false,
        title: 'Dashboard'
      }
      , {
        // 'txHash' will be present in the object passed to the 'activate' method of the viewmodel
        route: ['txInfo/:txHash'],
        name: 'txInfo',
        moduleId: PLATFORM.moduleName('./txInfo/txInfo'),
        nav: false,
        title: 'Transaction Information'
      }
    ]);

    config.fallbackRoute('');

    this.router = router;
  }

  static SchemeDashboards = [
    "Auction4Reputation",
    "ContributionReward",
    "ExternalLocking4Reputation",
    // "FixedReputationAllocation",
    "GenesisProtocol",
    "GlobalConstraintRegistrar",
    "LockingEth4Reputation",
    "LockingToken4Reputation",
    "NonArc",
    "SchemeRegistrar",
    "UpgradeScheme",
  ];

  public static hasDashboard(schemeName: string): boolean {
    return App.SchemeDashboards.indexOf(schemeName) !== -1;
  }

  public static
}
