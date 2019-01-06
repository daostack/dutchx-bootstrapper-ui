import { DialogController } from 'aurelia-dialog';
import { autoinject } from 'aurelia-framework';
// import { AureliaConfiguration } from 'aurelia-configuration';

@autoinject
export class Alert {

  public model: AlertModel;
  public okButton: HTMLElement;

  constructor(private controller: DialogController) { }

  public activate(model: AlertModel) {
    this.model = model;
  }

  public attached() {
    // attach-focus doesn't work
    $(this.okButton).focus();
  }
}

interface AlertModel {
  message: string;
}
