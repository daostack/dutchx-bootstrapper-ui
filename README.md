[![Build Status](https://api.travis-ci.org/daostack/dutchx-bootstrapper-ui.svg?branch=master)](https://travis-ci.org/daostack/dutchx-bootstrapper-ui)

# dxDAO Initializer

## Introduction

[@DAOstack/dutchx-bootstrapper-ui](https://github.com/daostack/dutchx-bootstrapper-ui) is a web application enabling anyone to earn reputation by several means in the GNOSIS dxDAO.

## Implementation
The application code uses the standards-compliant and highly modular browser-side framework [Aurelia](http://aurelia.io).

Browser-side the application uses TypeScript/ECMAScript 2015 (ES6).

At this time there are no web server-side components.

You may find the compiled and bundled javascript in the `dist-prod` folder.

[Webpack](https://webpack.js.org/) is used for bundling the javascript, html, css and images.

<a name="runApp"></a>
## Run the Application Locally

The following instructions describe how to run the application locally.  Assuming you have already cloned the [repository](https://github.com/daostack/dutchx-bootstrapper-ui):

Ensure that [NodeJS](https://nodejs.org/), v10.14.2 or greater, is installed.

1. Install all the dependencies:

    ```shell
    npm install
    ```

2. Build and host the application:

    ```shell
    npm start
    ```
3. Browse to http://127.0.0.1:8091


## Build and Run for Debugging

To build and run the application for debugging (no uglfying nor minifying, and with HMR):

1. Build and host the application:

    ```script
    npm start build.development.andServe
    ```

2. Browse to: http://localhost:8090/

With HRM, when you modify the source, changes will be automatically loaded into the running application, without requiring a manual full rebuild.  (Though certain TypeScript modifications do require refreshing the page, when the code is only executed when the page is loaded.)

## Application Configuration

Hard-coded application configuration is contained in static\app-config.json

## Code and Top-Level Pages

All of the application code is located under src except for index.ejs, which is the application starting point directing execution to main.ts.

The landing page is in landing.html and landing.ts.

The initialization UI is in dashboard.html and dashboard.ts.
