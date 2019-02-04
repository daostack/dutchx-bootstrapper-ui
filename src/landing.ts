import { App } from 'app';
import { AureliaConfiguration } from 'aurelia-configuration';
import { autoinject } from 'aurelia-framework';
import { DateService } from 'services/DateService';

@autoinject
export class Landing {

  private lockingPeriodStartDate: Date;
  private scheduleModel = {
    isLanding: true,
  };

  constructor(
    private appConfig: AureliaConfiguration,
    private dateService: DateService
  ) {
    this.lockingPeriodStartDate = this.dateService
      .fromIsoString(this.appConfig.get('Landing.lockingPeriodStartDate'), App.timezone);
  }

  public activate() {
    $('body').css('overflow', 'auto');
  }

  private msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }

  private countdownUnits(): string {
    return (this.msUntilCanLockCountdown() >= 86400000) ? 'days' :
      ((this.msUntilCanLockCountdown() >= 3600000) ? 'hours' :
        (this.msUntilCanLockCountdown() >= 60000 ? 'minutes' : 'seconds')
      );
  }
}
