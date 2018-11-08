import { autoinject, computedFrom, observable, singleton } from "aurelia-framework";
import { DaoService, DaoEx } from "../services/DaoService";
import { Address, WrapperService } from "../services/ArcService";
import { SchemeService, SchemeInfo } from "../services/SchemeService";
import { Web3Service } from '../services/Web3Service';
import { EventAggregator } from 'aurelia-event-aggregator';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { AureliaConfiguration } from "aurelia-configuration";
import { DisposableCollection } from 'services/DisposableCollection';
import { NetworkConnectionWizards } from 'services/networkConnectionWizards';
import { EventConfigFailure } from 'entities/GeneralEvents';
import { App } from 'app';
import { DialogCloseResult } from 'aurelia-dialog';

@singleton(false)
@autoinject
export class Dashboard {

  private address: string;
  private orgName: string;
  private tokenSymbol: string;
  private dutchXSchemes: Array<SchemeInfo>;
  private subscriptions = new DisposableCollection();
  private avatarLoading: boolean = true;
  private avatarLoaded: boolean = false;
  private schemesLoaded: boolean = false;
  private schemesLoading: boolean = false;
  private dashboardElement: any;
  private lockingPeriodEndDate: Date;
  private canRedeem: boolean = false;
  private networkName: string;
  private options: { address?: Address };

  private _loading: boolean = false;

  /**
   * true if loading the avatar or its schemes
   */
  @computedFrom("_loading")
  private get loading() {
    return this._loading;
  }

  private set loading(newValue: boolean) {
    if (newValue !== this._loading) {
      this.eventAggregator.publish("DAO.Loading", newValue);
      this._loading = newValue;
    }
  }

  private dutchXSchemeConfigs = new Map<string, { description: string, icon?: string, icon_hover?: string, position: number }>([
    ["LockingEth4Reputation", { description: "LOCK ETH", icon: './eth_icon_color.svg', icon_hover: './eth_icon_white.svg', position: 1 }],
    ["LockingToken4Reputation", { description: "LOCK GNO", icon: './gno_icon_color.svg', icon_hover: './gno_icon_white.svg', position: 2 }],
    ["ExternalLocking4Reputation", { description: "LOCK MGN", icon: './mgn_icon_color.svg', icon_hover: './mgn_icon_white.svg', position: 3 }],
    ["Auction4Reputation", { description: "BID GEN", icon: './gen_icon_color.svg', icon_hover: './gen_icon_white.svg', position: 4 }],
    // ["FixedReputationAllocation", { description: "REDEEM YOUR COUPON" , position: 5 }],
  ]);

  public org: DaoEx;

  constructor(
    private daoService: DaoService
    , private web3: Web3Service
    , private schemeService: SchemeService
    , private web3Service: Web3Service
    , private eventAggregator: EventAggregator
    , private appConfig: AureliaConfiguration
    , private networkConnectionWizards: NetworkConnectionWizards
  ) {
    $(window).resize(this.fixScrollbar);
  }

  async activate(options: { address?: Address } = {}) {

    this.options = options;
    /*******************
     * Handle network change.  Must load a new DAO.
     */
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Id", () => {
      this.networkName = this.web3.networkName;
      this.loadAvatar();
    }));

    /*******************
     * Handle account change.  Load a DAO if we don't already have one.
     * This shiould only happen when there was already a network and an account.
     */
    this.subscriptions.push(this.eventAggregator.subscribe("Network.Changed.Account", () => {
      if (!this.org) {
        this.loadAvatar();
      }
    }));

    /*******************
     * Handle avatar loaded.  Load schemes.
     */
    this.subscriptions.push(this.eventAggregator.subscribe("Avatar.loaded", () => { this.loadSchemes(); }));

    this.networkName = this.web3.networkName;

    /*******************
     * Start wizard if there is no DAO, otherwise we're good
     */
    if (!this.org) {
      /**
       * we'll handle events from here to load a DAO
       */
      this.networkConnectionWizards.run(false);
      this.loadAvatar();
    }
  }

  deactivate() {
    this.subscriptions.dispose();
    this.networkConnectionWizards.close(true);
  }

  async attached() {

    /** 
     * prevents some jitter
     */
    this.fixScrollbar();

    this.lockingPeriodEndDate = App.lockingPeriodEndDate;
    const msUntilCanRedeem = App.msUntilCanRedeem;
    setTimeout(() => {
      this.canRedeem = true;
      $('#globalRedeemBtn').addClass('enabled');
    }, msUntilCanRedeem);

    const dashboard = $(this.dashboardElement);

    /**
     * css will reference the 'selected' class
     */
    dashboard.on('show.bs.collapse', '.scheme-dashboard', function (e: Event) {
      // ignore bubbles from nested collapsables
      if (!$(this).is(<any>e.target)) return;

      const button = $(e.target);
      const li = button.closest('li');
      li.addClass("selected");
    });

    dashboard.on('hide.bs.collapse', '.scheme-dashboard', function (e: Event) {
      // ignore bubbles from nested collapsables
      if (!$(this).is(<any>e.target)) return;

      const button = $(e.target);
      const li = button.closest('li');
      li.removeClass("selected");
    });

    this.polishDom();
  }

  async loadAvatar(): Promise<DaoEx | undefined> {
    const address = this.options.address || this.appConfig.get("daoAddress");

    if (!this.org || (address !== this.org.address)) {

      this.avatarLoaded = this.schemesLoaded = this.schemesLoading = false;
      this.avatarLoading = this.loading = true;
      this.org = undefined;

      if (address) {
        // DutchX hardcoded avatar
        this.org = await this.daoService.daoAt(address);
      }

      if (this.org) {
        this.address = this.org.address;
        this.orgName = this.org.name;
        this.avatarLoaded = true;
      }

      this.avatarLoading = false;
      this.polishDom();

      if (this.org) {
        this.eventAggregator.publish("Avatar.loaded", this.org);
      } else {
        this.loading = false;
        this.networkConnectionWizards.run(true); // noop if already running
      }
    }

    return this.org;
  }

  async loadSchemes(): Promise<boolean> {
    this.schemesLoading = this.loading = true;
    /**
     * Get all schemes associated with the DAO.  These can include non-Arc schemes.
     */
    let schemes = await this.schemeService.getSchemesForDao(this.address);

    // add a fake non-Arc scheme
    // schemes.push(<SchemeInfo>{ address: "0x9ac0d209653719c86420bfca5d31d3e695f0b530" });

    const nonArcSchemes = schemes.filter((s: SchemeInfo) => !s.inArc);

    for (let i = 0; i < nonArcSchemes.length; ++i) {
      const scheme = nonArcSchemes[i];
      const foundScheme = await this.findNonDeployedArcScheme(scheme);
      if (foundScheme) {
        schemes[schemes.indexOf(scheme)] = foundScheme;
      }
    }

    this.dutchXSchemes = schemes.filter((s: SchemeInfo) => s.inArc && s.inDao)
      // DutchX: hack to remove all but the DutchX contracts
      .filter((s: SchemeInfo) => this.dutchXSchemeConfigs.has(s.name))
      .sort((a: SchemeInfo, b: SchemeInfo) =>
        this.dutchXSchemeConfigs.get(a.name).position - this.dutchXSchemeConfigs.get(b.name).position
      );

    this.dutchXSchemes.map((s) => { s.friendlyName = this.dutchXSchemeConfigs.get(s.name).description; });

    this.schemesLoaded = this.dutchXSchemes.length !== this.dutchXSchemeConfigs.keys.length;
    if (!this.schemesLoaded) {
      this.eventAggregator.publish("handleFailure", new EventConfigFailure(`not all of the required contracts were found`));
      this.networkConnectionWizards.run(true); // no-op if already running
    } else {
      this.eventAggregator.publish("DAO.loaded", this.org);
    }
    this.schemesLoading = this.loading = false;

    this.polishDom();

    return Promise.resolve(this.schemesLoaded);
  }

  private loadingChanged(newValue: boolean) {
    this.eventAggregator.publish("DAO.Loading", newValue);
  }

  private redeem() {
    if (this.canRedeem) { alert('this will redeem for all contracts'); }
  }

  private async findNonDeployedArcScheme(scheme: SchemeInfo): Promise<SchemeInfo | null> {
    const code = await (<any>Promise).promisify((callback: any): any =>
      this.web3Service.web3.eth.getCode(scheme.address, callback))();
    for (const wrapperName in WrapperService.nonUniversalSchemeFactories) {
      const factory = WrapperService.nonUniversalSchemeFactories[wrapperName];
      if (factory) {
        const contract = await factory.ensureSolidityContract();
        const found = code === contract.deployedBinary;
        if (found) {
          const wrapper = await factory.at(scheme.address);
          return SchemeInfo.fromContractWrapper(wrapper, true);
        }
      }
    }
    return null;
  }

  private fixScrollbar() {

    const bodyHeight = $(window).height() || 0;
    const headerHeight = $('.header.navbar').outerHeight() || 0;
    const footerHeight = $('.footer.navbar').outerHeight() || 0;

    $('.dashboard-main-content').css(
      {
        "max-height": `${bodyHeight - footerHeight - headerHeight}px`
      });
  }

  private polishDom() {
    setTimeout(() => { this.fixScrollbar(); }, 0);
  }

  getDashboardView(scheme: SchemeInfo): string {
    let name: string;
    let isArcScheme = false;
    if (!scheme.inArc) {
      name = "NonArc";
    } else if (!scheme.inDao) {
      name = "NotRegistered";
    } else {
      name = scheme.name;
      isArcScheme = true;
    }

    if (isArcScheme && !App.hasDashboard(name)) {
      name = "UnknownArc";
    }
    return `../schemeDashboards/${name}`;
  }

  schemeDashboardViewModel(scheme: SchemeInfo): SchemeDashboardModel {
    return Object.assign({}, {
      org: this.org,
      orgName: this.orgName,
      orgAddress: this.address,
      tokenSymbol: this.tokenSymbol,
    },
      scheme)
  }

  getSchemeIndexFromAddress(address: string, collection: Array<SchemeInfo>): number {
    let result = collection.filter((s) => s.address === address);
    if (result.length > 1) {
      throw new Error("getSchemeInfoWithAddress: More than one schemes found");
    }
    return result.length ? collection.indexOf(result[0]) : -1;
  }
}
