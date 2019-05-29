import { autoinject } from 'aurelia-framework';

@autoinject
export class Landing {

  constructor() {}

  public activate() {
    setTimeout(() => $('body').css('overflow-y', 'scroll'), 0);
  }
}
