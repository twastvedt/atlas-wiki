require('core-js/stable')
require('regenerator-runtime/runtime')

/* global siteConfig */
/* eslint-disable no-unused-expressions */

switch (window.document.documentElement.lang) {
  case 'ar':
  case 'fa':
    import(/* webpackChunkName: "fonts-arabic" */ './scss/fonts/arabic.scss')
    break
  default:
    import(/* webpackChunkName: "fonts-default" */ './scss/fonts/default.scss')
    break
}

require('modernizr')

require('./scss/app.scss')
import(/* webpackChunkName: "theme" */ './themes/' + siteConfig.theme + '/scss/app.scss')

require('leaflet/dist/leaflet.css')
require('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css')

import(/* webpackChunkName: "mdi" */ '@mdi/font/css/materialdesignicons.css')

require('./helpers/compatibility.js')
require('./client-app.js')
import(/* webpackChunkName: "theme" */ './themes/' + siteConfig.theme + '/js/app.js')
