import 'arrive'; // do bmd does it's thing whenever views are attached
/// <reference types="aurelia-loader-webpack/src/webpack-hot-interface"/>
import { Aurelia } from 'aurelia-framework';
import { PLATFORM } from 'aurelia-pal';
import 'bootstrap-material-design';

// supplied by Webpack
export async function configure(aurelia: Aurelia) {

  aurelia.use
    .standardConfiguration()
    .plugin(PLATFORM.moduleName('aurelia-animator-css'))
    .plugin(PLATFORM.moduleName('aurelia-configuration'), (config) => {
      config.setDirectory('./');
      config.setConfig('app-config.json');
    })
    ;

  aurelia.use.developmentLogging(process.env.env === 'development' ? 'debug' : 'info');

  aurelia.use.globalResources([
    PLATFORM.moduleName('header'),
    PLATFORM.moduleName('resources/valueConverters/date'),
  ]);

  await aurelia.start();
  await aurelia.setRoot(PLATFORM.moduleName('app'));
}
