import { autoinject } from 'aurelia-framework';
import { BindingSignaler } from 'aurelia-templating-resources';
import { Router } from 'aurelia-router';

@autoinject
export class Landing {

  msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }

  lockingPeriodStartDate: Date;
  lockingPeriodEndDate: Date;
  governanceStartDate: Date;
  intervalId: any;

  constructor(
    private signaler: BindingSignaler
    , private router: Router
  ) {
    this.lockingPeriodStartDate = new Date("2019-02-18T00:00:00.000Z");
    this.lockingPeriodEndDate = new Date("2019-03-21T00:00:00.000Z");
    this.governanceStartDate = new Date("2019-04-04T00:00:00.000Z");
  }

  activate() {
    $("body").css("overflow", "auto");
  }
}
