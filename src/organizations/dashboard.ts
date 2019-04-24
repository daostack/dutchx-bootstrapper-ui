import { App } from 'app';
import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom, singleton } from 'aurelia-framework';
import { BaseNetworkPage } from 'baseNetworkPage';
import { EventConfigException } from 'entities/GeneralEvents';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { BalloonService } from 'services/balloonService';
import { DateService } from 'services/DateService';
import { IDisposable } from 'services/IDisposable';
import { LockService } from 'services/lockServices';
import { NetworkConnectionWizards } from 'services/networkConnectionWizards';
import { Utils as UtilsInternal } from 'services/utils';
import {
  Address,
  ArcService,
  ExternalLocking4ReputationWrapper,
  Locking4ReputationWrapper,
  WrapperService,
} from '../services/ArcService';
import { DaoEx, DaoService } from '../services/DaoService';
import { SchemeInfo, SchemeService } from '../services/SchemeService';
import { BigNumber, Web3Service } from '../services/Web3Service';

@singleton(false)
@autoinject
export class Dashboard extends BaseNetworkPage {

  @computedFrom('redeemables')
  private get totalUserReputationEarned(): BigNumber {
    return this.redeemables.map((r: IRedeemable): BigNumber => r.amount)
      .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
        return prev.add(curr);
      }, new BigNumber(0));
  }

  @computedFrom('totalUserReputationEarned', 'totalReputationAvailable')
  private get percentUserReputationEarned(): BigNumber {
    return this.totalUserReputationEarned.mul(100).div(this.totalReputationAvailable);
  }

  private repSummaryCheck: IDisposable = null;
  private tokenSymbol: string;
  private dashboardElement: any;
  private lockingPeriodEndDate: Date;
  private governanceStartDate: Date;
  private redeemingStartDate: Date;
  private fakeRedeem: boolean = false;
  private hasComputedReputation: boolean = false;
  private redeemables: Array<IRedeemable> = new Array<IRedeemable>();
  private totalReputationAvailable: BigNumber;
  private computingRedeemables: boolean = false;
  private dashboardBusy: boolean = false;
  private showingDisclaimer = true;
  private canComputeReputation = false;
  private scheduleModel = {
    dao: undefined as DaoEx,
  };

  constructor(
    daoService: DaoService,
    web3: Web3Service,
    schemeService: SchemeService,
    web3Service: Web3Service,
    eventAggregator: EventAggregator,
    appConfig: AureliaConfiguration,
    arcService: ArcService,
    networkConnectionWizards: NetworkConnectionWizards,
    private dateService: DateService
  ) {
    super(
      web3,
      schemeService,
      daoService,
      eventAggregator,
      appConfig,
      networkConnectionWizards,
      arcService,
      web3Service);

    $(window).resize(this.fixScrollbar);
  }

  public async activate(options:
    { address?: Address, fakeRedeem?: string } = {}): Promise<void> {

    // tslint:disable-next-line: no-console
    // console.time('activate');

    this.fakeRedeem = !!options.fakeRedeem || false;
    // this.referrerAddress = options.ref;

    this.subscriptions.push(this.eventAggregator.subscribe('Lock.Released', () => {
      this.computeNumLocks();
    }));

    this.subscriptions.push(this.eventAggregator.subscribe('Lock.Submitted', () => {
      this.computeNumLocks();
    }));

    this.subscriptions.push(this.eventAggregator.subscribe('dashboard.busy', (val: boolean) => {
      if (val) {
        $('.dashboard-schemes li.list-group-item').addClass('frozen');
      } else {
        $('.dashboard-schemes li.list-group-item').removeClass('frozen');
      }
      this.dashboardBusy = val;
    }));

    return super.activate(options);

    // tslint:disable-next-line: no-console
    // console.timeEnd('activate');
  }

  public async attached() {

    $('body').css('overflow-y', 'hidden');

    // tslint:disable-next-line: no-console
    // console.time('attached');

    /**
     * prevents some jitter
     */
    this.fixScrollbar();

    if (this.fakeRedeem && this.web3Service.isConnected && (this.networkName === 'Ganache')) {
      await UtilsInternal.increaseTime(100000000000, this.web3.web3);
    }

    const dashboard = $(this.dashboardElement);

    /**
     * css will reference the 'selected' class
     */
    dashboard.on('show.bs.collapse', '.scheme-dashboard', (e: Event) => {

      if (this.dashboardBusy) {
        e.preventDefault();
        return;
      }

      const button = $(e.target);
      const li = button.closest('li');
      li.addClass('selected');
      BalloonService.unhide(button as JQuery);
    });

    dashboard.on('hide.bs.collapse', '.scheme-dashboard', (e: Event) => {

      if (this.dashboardBusy) {
        e.preventDefault();
        return;
      }

      const button = $(e.target);
      const li = button.closest('li');
      li.removeClass('selected');
      BalloonService.hide(button as JQuery);
    });

    this.polishDom();

    // tslint:disable-next-line: no-console
    // console.timeEnd('attached');
  }

  protected async loadAvatar(): Promise<DaoEx | undefined> {
    const address = this.options.address || this.appConfig.get('daoAddress');
    if (!this.org || (address !== this.org.address)) {
      if (this.repSummaryCheck) {
        this.repSummaryCheck.dispose();
        this.repSummaryCheck = null;
      }
      return super.loadAvatar().then((dao: DaoEx): DaoEx | undefined => {
        this.polishDom();
        return dao;
      });
    } else {
      return this.org;
    }
  }

  protected async loadSchemes(): Promise<boolean> {
    return super.loadSchemes().then(async (schemesLoaded: boolean): Promise<boolean> => {
      if (schemesLoaded) {
        this.dutchXSchemes.push(
          {
            address: '',
            blockNumber: 0,
            friendlyName: 'DAO STORYTELLING',
            inArc: true,
            inDao: true,
            isRegistered: false,
            name: 'DaoStorytelling',
          }
        );

        await this.computeNumLocks();

        const mgnWrapper =
          (await this.getSchemeWrapperFromName('ExternalLocking4Reputation')) as ExternalLocking4ReputationWrapper;
        this.appConfig.set('mgnWrapper', mgnWrapper as any);

        const lockDates = await this.getLockDates();

        /**
         * store away for the rest of the UI, in the config for backward-compatibility
         */
        this.appConfig.set('lockingPeriodStartDate', lockDates.start as any);
        this.appConfig.set('lockingPeriodEndDate', lockDates.end as any);

        this.lockingPeriodEndDate = lockDates.end;
        this.governanceStartDate = this.dateService
          .fromIsoString(this.appConfig.get('governanceStartDate'));
        // one second after locking period ends
        this.redeemingStartDate = new Date(this.lockingPeriodEndDate.getTime() + 1000);

        // now that dates are set we can set this
        this.scheduleModel.dao = this.org;

        const blockNumber = await UtilsInternal.lastBlockDate(this.web3Service.web3);

        if (this.fakeRedeem || this.computeCanComputeReputation(blockNumber)) {
          this.canComputeReputation = true;
          this.computeRedeemables();
        } else {

          this.repSummaryCheck =
            this.eventAggregator.subscribe('secondPassed', async (blockDate: Date) => {

              if (!this.hasComputedReputation && !this.computingRedeemables &&
                (this.fakeRedeem || this.computeCanComputeReputation(blockDate))) {

                this.canComputeReputation = true;
                this.repSummaryCheck.dispose();
                this.repSummaryCheck = null;
                this.computeRedeemables();
              }
            });
        }
      }
      this.polishDom();
      return schemesLoaded;
    });
  }

  private getDashboardView(scheme: SchemeInfo): string {
    let name: string;
    let isArcScheme = false;
    if (!scheme.inArc) {
      name = 'NonArc';
    } else if (!scheme.inDao) {
      name = 'NotRegistered';
    } else {
      name = scheme.name;
      isArcScheme = true;
    }

    if (isArcScheme && !App.hasDashboard(name)) {
      name = 'UnknownArc';
    }
    return `../schemeDashboards/${name}`;
  }

  private schemeDashboardViewModel(scheme: SchemeInfo): ISchemeDashboardModel {
    return Object.assign({}, {
      legalContractHash: this.appConfig.get('legalContractHash'),
      org: this.org,
      orgAddress: this.address,
      orgName: this.orgName,
      tokenSymbol: this.tokenSymbol,
    },
      scheme);
  }

  private async computeRedeemables(): Promise<void> {

    this.computingRedeemables = true;
    let totalReputationAvailable = new BigNumber(0);
    const redeemables = new Array<IRedeemable>();
    let contractRepReward: BigNumber;

    try {
      let schemeInfo = this.getSchemeInfoFromName('LockingEth4Reputation');
      let schemeAddress = schemeInfo.address;
      let schemeBirthBlock = schemeInfo.blockNumber;
      let wrapper: Locking4ReputationWrapper = await WrapperService.factories.LockingEth4Reputation.at(schemeAddress);
      let earnedRep = await wrapper.getUserEarnedReputation(
        {
          contractBirthBlock: schemeBirthBlock,
          lockerAddress: this.web3.defaultAccount,
        });
      contractRepReward = await wrapper.getReputationReward();
      totalReputationAvailable = totalReputationAvailable.add(contractRepReward);

      redeemables.push({
        amount: earnedRep,
        what: 'Locked ETH',
      });

      schemeInfo = this.getSchemeInfoFromName('LockingToken4Reputation');
      schemeAddress = schemeInfo.address;
      schemeBirthBlock = schemeInfo.blockNumber;
      wrapper = await WrapperService.factories.LockingToken4Reputation.at(schemeAddress);
      earnedRep = await wrapper.getUserEarnedReputation(
        {
          contractBirthBlock: schemeBirthBlock,
          lockerAddress: this.web3.defaultAccount,
        });
      contractRepReward = await wrapper.getReputationReward();
      totalReputationAvailable = totalReputationAvailable.add(contractRepReward);

      redeemables.push({
        amount: earnedRep,
        what: 'Locked tokens',
      });

      schemeInfo = this.getSchemeInfoFromName('ExternalLocking4Reputation');
      schemeAddress = schemeInfo.address;
      schemeBirthBlock = schemeInfo.blockNumber;
      wrapper = await WrapperService.factories.ExternalLocking4Reputation.at(schemeAddress);
      earnedRep = await wrapper.getUserEarnedReputation(
        {
          contractBirthBlock: schemeBirthBlock,
          lockerAddress: this.web3.defaultAccount,
        });
      contractRepReward = await wrapper.getReputationReward();
      totalReputationAvailable = totalReputationAvailable.add(contractRepReward);

      redeemables.push({
        amount: earnedRep,
        what: 'Registered MGN tokens',
      });

      schemeInfo = this.getSchemeInfoFromName('Auction4Reputation');
      schemeAddress = schemeInfo.address;
      schemeBirthBlock = schemeInfo.blockNumber;
      const auctionWrapper = await WrapperService.factories.Auction4Reputation.at(schemeAddress);
      const numAuctions = await auctionWrapper.getNumberOfAuctions();
      earnedRep = new BigNumber(0);
      for (let auctionId = 0; auctionId < numAuctions; ++auctionId) {
        earnedRep = earnedRep.add(await auctionWrapper.getUserEarnedReputation
          (
            {
              auctionId,
              beneficiaryAddress: this.web3.defaultAccount,
              contractBirthBlock: schemeBirthBlock,
            }));
        await UtilsInternal.sleep(0);
      }
      contractRepReward = await auctionWrapper.getReputationReward();
      totalReputationAvailable = totalReputationAvailable.add(contractRepReward);

      redeemables.push({
        amount: earnedRep,
        what: 'Bid GEN tokens',
      });

      this.totalReputationAvailable = totalReputationAvailable;
      this.redeemables = redeemables;
    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`Unable to compute earned reputation `, ex));
    } finally {
      this.computingRedeemables = false;
      this.hasComputedReputation = true;
    }
  }

  private computeNumLocks(): void {
    this.getSchemeWrapperFromName('LockingEth4Reputation')
      .then((wrapper: Locking4ReputationWrapper) => {
        const schemeInfo1 = this.getSchemeInfoFromName('LockingEth4Reputation');
        const lockService = new LockService(wrapper, this.web3Service.defaultAccount, schemeInfo1.blockNumber);
        lockService.getUserUnReleasedLockCount()
          .then((numLocks: number) => {
            schemeInfo1.numLocks = numLocks;
          });
      });

    this.getSchemeWrapperFromName('LockingToken4Reputation')
      .then((wrapper: Locking4ReputationWrapper) => {
        const schemeInfo2 = this.getSchemeInfoFromName('LockingToken4Reputation');
        const lockService = new LockService(wrapper, this.web3Service.defaultAccount, schemeInfo2.blockNumber);
        lockService.getUserUnReleasedLockCount()
          .then((numLocks: number) => {
            schemeInfo2.numLocks = numLocks;
          });
      });
  }

  /**
   * returns LockingEth4Reputation start and end dates
   */
  private async getLockDates(): Promise<IContractLockDates> {
    // tslint:disable-next-line: no-console
    // console.time('getLockDates');
    const wrapper = await this.getSchemeWrapperFromName('LockingEth4Reputation');
    const dates = {
      end: await wrapper.getLockingEndTime(),
      start: await wrapper.getLockingStartTime(),
    };
    // tslint:disable-next-line: no-console
    // console.timeEnd('getLockDates');
    return dates;
  }

  private fixScrollbar() {

    const bodyHeight = $(window).height() || 0;
    const headerHeight = $('.header.navbar').outerHeight() || 0;
    const footerHeight = $('.footer.navbar').outerHeight() || 0;
    const disclaimer = $('.disclaimer').outerHeight() || 0;

    $('.dashboard-main-content').css(
      {
        'max-height': `${bodyHeight - headerHeight - footerHeight - disclaimer}px`,
      });

    $('.disclaimer').css({
      'max-height': `${bodyHeight - headerHeight - footerHeight}px`,
    });
  }

  private polishDom() {
    setTimeout(() => { this.fixScrollbar(); }, 0);
  }

  private computeCanComputeReputation(blockDate: Date) {
    return blockDate.getTime() > this.lockingPeriodEndDate.getTime();
  }

  private toggleDisclaimer() {
    this.showingDisclaimer = !this.showingDisclaimer;
    $('.dashboard-page #disclaimer').collapse('toggle');
    $('.dashboard-page #disclaimer').one(
      this.showingDisclaimer ? 'shown.bs.collapse' : 'hidden.bs.collapse', () => { this.fixScrollbar(); }
    );
  }
}

interface IRedeemable {
  amount: BigNumber;
  what: string;
}

interface IContractLockDates {
  end: Date;
  start: Date;
}
