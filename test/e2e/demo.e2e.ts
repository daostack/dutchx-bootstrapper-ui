import { $, $$, browser, by, By, element, ExpectedConditions } from 'aurelia-protractor-plugin/protractor';
import { config } from '../protractor.conf';
import { PageObjectHome } from './home.po';

describe('dxDAO Initializer app', function() {
  let poHome: PageObjectHome;

  beforeEach(async () => {
    poHome = new PageObjectHome();

    await browser.loadAndWaitForAureliaPage(`http://localhost:${config.port}`);
  });

  it('should load the page and display the initial page title', async () => {
    await expect(poHome.getCurrentPageTitle()).toBe('Dashboard | dxDAO Initializer');
  });

  it('should display greeting', async () => {
    await expect(poHome.getGreeting()).toBe('Creating DAOs for a Collective Intelligence');
  });

  // it('should automatically write down the fullname', async () => {
  //   await poHome.setFirstname('John');
  //   await poHome.setLastname('Doe');

  //   // binding is not synchronous,
  //   // therefore we should wait some time until the binding is updated
  //   await browser.wait(
  //     ExpectedConditions.textToBePresentInElement(
  //       poHome.getFullnameElement(), 'JOHN DOE'
  //     ), 200
  //   );
  // });

  // it('should show alert message when clicking submit button', async () => {
  //   await expect(poHome.openAlertDialog()).toBe(true);
  // });

  // it('should navigate to the page', async () => {
  //   await poAnotherPage.navigateTo('#/anotherPage');
  //   await expect(poAnotherPage.getCurrentPageTitle()).toBe('..whatever it is...');
  // });
});
