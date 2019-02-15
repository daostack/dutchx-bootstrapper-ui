import { App } from 'app';
import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { DateService } from 'services/DateService';
import { DisposableCollection } from 'services/DisposableCollection';
import { IDisposable } from 'services/IDisposable';
import { Web3Service } from 'services/Web3Service';
import { Web3 } from 'web3';

@autoinject
export class Schedule {

  private lockingPeriodEndDate: Date;
  private lockingPeriodStartDate: Date;
  private governanceStartDate: Date;
  private lastLockingPeriodDate: Date;
  private sectionElement: HTMLElement;
  private isLanding: boolean;
  private lockingPeriodHasNotStarted: boolean;
  private inLockingPeriod: boolean;
  private inRepDistributionPeriod: boolean;
  private inGovernancePeriod: boolean;
  private subscriptions = new DisposableCollection();

  constructor(
    private appConfig: AureliaConfiguration,
    protected eventAggregator: EventAggregator,
    private dateService: DateService,
    private web3: Web3Service
  ) {
  }

  public activate(model: { isLanding: boolean }) {
    this.isLanding = (model && model.isLanding) || !this.web3.isConnected;
    this.lockingPeriodEndDate = this.dateService
      .fromIsoString(this.appConfig.get(
        this.isLanding ? 'Landing.lockingPeriodEndDate' : 'lockingPeriodEndDate'), App.timezone);
    this.lockingPeriodStartDate = this.dateService
      .fromIsoString(this.appConfig.get(
        this.isLanding ? 'Landing.lockingPeriodStartDate' : 'lockingPeriodStartDate'), App.timezone);
    this.governanceStartDate = this.dateService
      .fromIsoString(this.appConfig.get('governanceStartDate'), App.timezone);
    /**
     * 24-hours before governance period starts
     */
    this.lastLockingPeriodDate = new Date(this.governanceStartDate.getTime() - 86400000);

    if (!this.isLanding) {
      this.subscriptions.push(this.eventAggregator
        .subscribe('DAO.loaded', () => {
          this.lockingPeriodEndDate = this.dateService
            .fromIsoString(this.appConfig.get('lockingPeriodEndDate'), App.timezone);
          this.lockingPeriodStartDate = this.dateService
            .fromIsoString(this.appConfig.get('lockingPeriodStartDate'), App.timezone);
        }));
    }
  }

  public attached() {
    if (this.isLanding) {
      $(this.sectionElement).addClass('landing');
    }
    this.subscriptions.push(this.eventAggregator.subscribe('secondPassed', () => {
      this.getGovPeriod();
      if (this.inGovernancePeriod) {
        this.subscriptions.dispose();
        return;
      }
      this.getLockingPeriodHasNotStarted();
      this.getInLockingPeriod();
      this.getInRepDistPeriod();
    }));
  }

  public detached() {
    this.subscriptions.dispose();
  }

  private getLockingPeriodHasNotStarted(): boolean {
    const now = new Date();
    return this.lockingPeriodHasNotStarted = (now < this.lockingPeriodStartDate);
  }

  private getInLockingPeriod(): boolean {
    const now = new Date();
    return this.inLockingPeriod =
      (now >= this.lockingPeriodStartDate) && (now < this.lockingPeriodEndDate);
  }

  private getInRepDistPeriod(): boolean {
    const now = new Date();
    return this.inRepDistributionPeriod =
      (now >= this.lockingPeriodEndDate) && (now < this.governanceStartDate);
  }

  private getGovPeriod(): boolean {
    const now = new Date();
    return this.inGovernancePeriod = (now >= this.governanceStartDate);
  }

  private getTriangle(): string {
    return this.isLanding ? './DS_DXDAO_ARROW_ICON_white.svg' : './DS_DXDAO_ARROW_ICON_black.svg';
  }
}
