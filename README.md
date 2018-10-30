[![Build Status](https://api.travis-ci.org/daostack/dutchx-bootstrapper-ui.svg?branch=master)](https://travis-ci.org/daostack/dutchx-bootstrapper-ui)

# DutchX Initializer

## Introduction

[@DAOstack/dutchx-bootstrapper-ui](https://github.com/daostack/dutchx-bootstrapper-ui) is a web application enabling anyone to earn reputation by several means in the GNOSIS DutchX DAO.

## Implementation
The application code uses the standards-compliant and highly modular browser-side framework [Aurelia](http://aurelia.io).

Browser-side the application uses TypeScript/ECMAScript 2015 (ES6).

At this time there are no web server-side components.

You may find the compiled and bundled javascript in the `dist-prod` folder.

[Webpack](https://webpack.js.org/) is used for bundling the javascript, html, css and images.

<a name="runApp"></a>
## Run the Application Locally

The following instructions describe how to run the application locally.  Assuming you have already cloned the [repository](https://github.com/daostack/dutchx-bootstrapper-ui):

Ensure that [NodeJS](https://nodejs.org/), v9.4.0 or greater, is installed.

1. Install all the dependencies:

    ```shell
    npm install
    ```

2. build and run the application:

    ```shell
    npm run start
    ```


## Build and Run for Debugging

1. Build the application for development:

    ```script
    npm start build.development
    ```

2. Run the application:

    ```shell
    npm start browse.development
    ```

or manually browse to: http://localhost:8090/

## Build and Run for Debugging with Hot Module Replacement

1. Build the application for development and start the webpack server:

    ```shell
    npm start build.development.andServe
    ```

2. Browse to http://localhost:8090.

Now when you modify the source it will be automatically loaded into the running application, without requiring a manual full rebuild.

## Build and Run for Production

1. Build the application for production and start a server:

    ```shell
    npm start build.production.andServe
    ```

2. Run the application:

    ```shell
    npm start browse.production
    ```

or manually browse to: http://localhost:8091/
