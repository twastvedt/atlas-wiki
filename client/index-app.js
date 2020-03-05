require('core-js/stable')
require('regenerator-runtime/runtime')

switch (window.document.documentElement.lang) {
  case 'ar':
  case 'fa':
    require('./scss/fonts/arabic.scss')
    break
  default:
    require('./scss/fonts/default.scss')
    break
}

require('./scss/app.scss')
require('./themes/' + process.env.CURRENT_THEME + '/scss/app.scss')
require('leaflet/dist/leaflet.css')
require('leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.webpack.css')

require('@mdi/font/css/materialdesignicons.css')

require('./helpers/compatibility.js')
require('./client-app.js')
require('./themes/' + process.env.CURRENT_THEME + '/js/app.js')
