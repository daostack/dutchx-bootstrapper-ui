import { autoinject } from 'aurelia-framework';
import { DialogController } from 'aurelia-dialog';
// import { AureliaConfiguration } from 'aurelia-configuration';

@autoinject
export class Alert {

  model: AlertModel;
  okButton: HTMLElement;

  constructor(private controller: DialogController) { }

  activate(model: AlertModel) {
    this.model = model;
  }

  attached() {
    // attach-focus doesn't work
    $(this.okButton).focus();
  }
}

interface AlertModel {
  message: string;
}
