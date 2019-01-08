import {$, $$, browser, by, By, element, ExpectedConditions} from 'aurelia-protractor-plugin/protractor';

export class PageObjectHome {
  public getGreeting() {
    return element(by.tagName('h2')).getText();
  }

  public getCurrentPageTitle() {
    return browser.getTitle();
  }

  public async openAlertDialog() {
    // await this.pressSubmitButton();

    // await browser.wait(ExpectedConditions.alertIsPresent(), 5000);

    // try {
    //   await browser.switchTo().alert().accept();
    //   return true;
    // } catch (e) {
    //   return false;
    // }
  }
}
