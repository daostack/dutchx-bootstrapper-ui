import { autoinject } from 'aurelia-framework';
import { Router, RouterConfiguration } from 'aurelia-router';
import { PLATFORM } from 'aurelia-pal';
import { Web3Service } from "./services/Web3Service";
import { ArcService } from "./services/ArcService";
import '../static/styles.scss';
import { AureliaConfiguration } from 'aurelia-configuration';

@autoinject
export class App {
  public static lockingPeriodEndDate: Date;
  public static lockingPeriodStartDate: Date;
  public static msUntilCanLock: number;
  public static msUntilCanRedeem: number;

  public router: Router;

  constructor(
    private web3: Web3Service
    , private arcService: ArcService
    , appConfig: AureliaConfiguration
  ) {
    App.lockingPeriodStartDate = new Date(appConfig.get("lockingPeriodStartDate"));
    App.lockingPeriodEndDate = new Date(appConfig.get("lockingPeriodEndDate"));
    App.msUntilCanLock = App.lockingPeriodStartDate.getTime() - new Date().getTime();
    App.msUntilCanRedeem = App.lockingPeriodEndDate.getTime() - new Date().getTime();
  }

  attached() {
    /* override the body style set in the splash screen */
    (<any>$('body'))
      .css({
        "color": "black",
        "background-color": "white"
      })
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
        route: ['noDao'],
        name: 'noDao',
        moduleId: PLATFORM.moduleName('./error-pages/noDao/noDao'),
        nav: false,
        title: 'DAO Not Found'
      },
      {
        route: ['noaccount'],
        name: 'noaccount',
        moduleId: PLATFORM.moduleName('./error-pages/noaccount/noaccount'),
        nav: false,
        title: 'No Account'
      },
      /**
       * not connected and/or couldn't get the daostack addresses, either way treat as not connected
       */
      {
        route: ['notconnected'],
        name: 'notconnected',
        moduleId: PLATFORM.moduleName('./error-pages/notconnected/notconnected'),
        nav: false,
        title: 'Not Connected'
      },
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
