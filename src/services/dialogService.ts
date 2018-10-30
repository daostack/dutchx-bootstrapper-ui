import { autoinject } from "aurelia-framework";
import { DialogService as AureliaDialogService, DialogCloseResult, DialogSettings, DialogCancellableOpenResult, DialogOpenPromise } from "aurelia-dialog";

@autoinject
export class DialogService {

  constructor(
    private dialogService: AureliaDialogService) {
  }

  public open(
    viewModule: any, // result of `import {view} from "path to module files"`
    model: any, // object that is given to the module's `activate` function
    settings: DialogSettings = {}): DialogOpenPromise<DialogCancellableOpenResult> {

    //    this.adjustScroll();

    return this.dialogService.open(
      Object.assign({
        model: model,
        viewModel: viewModule
      }, settings));
  };

  /**
   * showing a dialog tends makes the vertical scrollbar disappear (the modal background?).
   * so if it's there, force it to remain.  if it's not, don't.
   * todo: don't do this if the dialog isn't meant to be modal?
   */
  // private adjustScroll() {
  //   if (this.browserService.verticalScrollBarIsShowing()) {
  //     $('body').addClass("showVerticalScroll");
  //   } else {
  //     $('body').removeClass("showVerticalScroll");
  //   }
  // }
}

export interface IPromptOptions {
  text: string;
  ok?: boolean;
  cancel?: boolean;
  yesNo?: boolean;
  title?: string;
}
