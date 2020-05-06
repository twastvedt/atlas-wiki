import L, { GeoJSON, Util} from 'leaflet'

import 'leaflet-distortableimage'
import 'leaflet-toolbar/dist/leaflet.toolbar.min.css'
import 'leaflet-distortableimage/dist/leaflet.distortableimage.css'

/*
 * @class GeoJSONWithImage
 * @aka L.GeoJSONWithImage
 * @inherits GeoJSON
 *
 * Represents a GeoJSON object or an array of GeoJSON objects. Allows you to parse
 * GeoJSON data and display it on the map. Includes support for distortable images stored as 4-point MultiPoints. Extends `GeoJSON`.
 */

export var GeoJSONWithImage = GeoJSON.extend({
  // @method addData( <GeoJSON> data ): this
  // Adds a GeoJSON object to the layer. Copied from Leaflet in order to provide an alternate `geometryToLayer` function.
  addData: function (geojson) {
    var features = Util.isArray(geojson) ? geojson : geojson.features
    var i; var len; var feature

    if (features) {
      for (i = 0, len = features.length; i < len; i++) {
        // only add this if geometry or geometries are set and not null
        feature = features[i]
        if (feature.geometries || feature.geometry || feature.features || feature.coordinates) {
          this.addData(feature)
        }
      }
      return this
    }

    var options = this.options

    if (options.filter && !options.filter(geojson)) { return this }

    var layer = geometryToLayer(geojson, options)
    if (!layer) {
      return this
    }
    layer.feature = GeoJSON.asFeature(geojson)

    layer.defaultOptions = layer.options
    this.resetStyle(layer)

    if (options.onEachFeature) {
      options.onEachFeature(geojson, layer)
    }

    return this.addLayer(layer)
  }
})

export function geometryToLayer(geojson, options) {
  var geometry = geojson.type === 'Feature' ? geojson.geometry : geojson
  var coords = geometry ? geometry.coordinates : null
  var _coordsToLatLng = (options && options.coordsToLatLng) || GeoJSON.coordsToLatLng

  if (geometry && geometry.type === 'MultiPoint' && coords && geojson.properties.imagePath) {
    const latlngs = GeoJSON.coordsToLatLngs(coords, 0, _coordsToLatLng)

    return L.distortableImageOverlay(geojson.properties.imagePath, {
      selected: false,
      editable: false,
      corners: latlngs,
      actions: [L.DragAction, L.ScaleAction, L.DistortAction, L.RotateAction, L.FreeRotateAction]
    })
  } else {
    return GeoJSON.geometryToLayer.call(this, geojson, options)
  }
}

L.DistortableImageOverlay.include({
  toGeoJSON: function (precision) {
    const coords = GeoJSON.latLngsToCoords(this.getCorners(), precision)

    return {
      type: 'Feature',
      geometry: {
        type: 'MultiPoint',
        coordinates: coords
      },
      properties: {
        imagePath: this._url
      }
    }
  },
  setStyle: function (options) {
    // Override setStyle of ImageOverlay, which is not compatible with layers in GeoJSON. (At least not for now. GeoJSON expects options.style to be a function, and ImageOverlay expects it to be an object.)
  }
})

export function geoJSONWithImage(geojson, options) {
  return new GeoJSONWithImage(geojson, options)
}
