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
    // $(window).resize(this.fixScrollbar);
  }

  public activate() {
    setTimeout(() => $('body').css('overflow-y', 'scroll'), 0);
  }

  // public attached() {
  //   this.fixScrollbar();
  // }

  private msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }

  private countdownUnits(): string {
    return (this.msUntilCanLockCountdown() >= 86400000) ? 'days' :
      ((this.msUntilCanLockCountdown() >= 3600000) ? 'hours' :
        (this.msUntilCanLockCountdown() >= 60000 ? 'minutes' : 'seconds')
      );
  }

  // private fixScrollbar() {

  //   const bodyHeight = $(window).outerHeight() || 0;
  //   const headerHeight = $('.landing-page .navbar').outerHeight() || 0;

  //   $('.landing-page .main-content').css(
  //     {
  //       'max-height': `${bodyHeight - headerHeight}px`,
  //     });
  // }

}
