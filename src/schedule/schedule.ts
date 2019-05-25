import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { DaoEx } from 'entities/DAO';
import { AureliaHelperService } from 'services/AureliaHelperService';
import { DateService } from 'services/DateService';
import { DisposableCollection } from 'services/DisposableCollection';

@autoinject
export class Schedule {

  private lockingPeriodEndDate: Date;
  private lockingPeriodStartDate: Date;
  private governanceStartDate: Date;
  private distributionPeriodStartDate: Date;
  private distributionPeriodEndDate: Date;
  private sectionElement: HTMLElement;
  private isLanding: boolean = false;
  private dao: DaoEx;
  private lockingPeriodHasNotStarted: boolean = false;
  private inLockingPeriod: boolean = false;
  private inRepDistributionPeriod: boolean = false;
  private inGovernancePeriod: boolean = false;
  private subscriptions = new DisposableCollection();

  constructor(
    private appConfig: AureliaConfiguration,
    protected eventAggregator: EventAggregator,
    private dateService: DateService,
    private aureliaHelperService: AureliaHelperService
  ) {
  }

  public activate(model: { isLanding?: boolean, dao?: DaoEx }) {
    this.isLanding = !!model.isLanding;
    this.dao = model.dao;

    if (!this.isLanding) {
      this.aureliaHelperService.createPropertyWatch(model, 'dao', (newDao: DaoEx) => {
        this.dao = newDao;
        this.initFromAppConfig();
      });
    }

    this.governanceStartDate = this.dateService
      .fromIsoString(this.appConfig.get('governanceStartDate'));

    /**
     * one second before governance period starts
     */
    this.distributionPeriodEndDate = new Date(this.governanceStartDate.getTime() - 1000);

    if (this.isLanding || this.dao) {
      this.initFromAppConfig();
    }
  }

  public attached() {
    if (this.isLanding) {
      $(this.sectionElement).addClass('landing');
    }

    this.getLockingPeriodHasNotStarted();
    this.getInLockingPeriod();
    this.getInRepDistPeriod();

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

  private initFromAppConfig() {
    /**
     * then the appConfig is good
     */
    this.lockingPeriodEndDate = this.dateService
      .fromIsoString(this.appConfig.get(`${this.isLanding ? 'Landing.' : ''}lockingPeriodEndDate`));
    this.lockingPeriodStartDate = this.dateService
      .fromIsoString(this.appConfig.get(`${this.isLanding ? 'Landing.' : ''}lockingPeriodStartDate`));
    /**
     * one second after locking period ends
     */
    this.distributionPeriodStartDate = new Date(this.lockingPeriodEndDate.getTime() + 1000);
    /** just for testing scenarios */
    if (this.distributionPeriodStartDate > this.governanceStartDate) {
      this.distributionPeriodStartDate = this.governanceStartDate;
    }
    /** just for testing scenarios */
    if (this.distributionPeriodEndDate < this.distributionPeriodStartDate) {
      this.distributionPeriodEndDate = this.distributionPeriodStartDate;
    }
  }
  private getLockingPeriodHasNotStarted(): boolean {
    const now = new Date();
    return this.lockingPeriodHasNotStarted = (now < this.lockingPeriodStartDate);
  }

  private getInLockingPeriod(): boolean {
    const now = new Date();
    return this.inLockingPeriod =
      (now >= this.lockingPeriodStartDate) && (now <= this.lockingPeriodEndDate);
  }

  private getInRepDistPeriod(): boolean {
    const now = new Date();
    return this.inRepDistributionPeriod =
      (now > this.lockingPeriodEndDate) && (now < this.governanceStartDate);
  }

  private getGovPeriod(): boolean {
    const now = new Date();
    return this.inGovernancePeriod = (now >= this.governanceStartDate);
  }

  private getTriangle(): string {
    return this.isLanding ? './DS_DXDAO_ARROW_ICON_white.svg' : './DS_DXDAO_ARROW_ICON_black.svg';
  }
}
