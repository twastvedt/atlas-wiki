import L from 'leaflet'

export default L.PM.Draw.extend({
  initialize(map) {
    this._map = map
    this._shape = 'Image'
    this.toolbarButtonName = 'placeImage'
  },
  enable(options) {
    L.Util.setOptions(this, options)

    // enable draw mode
    this._enabled = true

    this._image.editing.enable()

    // toggle the draw button of the Toolbar in case drawing mode got enabled without the button
    this._map.pm.Toolbar.toggleButton(this.toolbarButtonName, true)

    // an array used in the snapping mixin.
    // TODO: think about moving this somewhere else?
    this._otherSnapLayers = []
  },
  disable() {
    // disable draw mode

    // cancel, if drawing mode isn't even enabled
    if (!this._enabled) {
      return
    }

    this._enabled = false

    // reset cursor
    this._map._container.style.cursor = ''

    if (this.tempMapDoubleClickZoomState) {
      this._map.doubleClickZoom.enable()
    }

    this._image.editing.disable()

    // fire drawend event
    this._map.fire('pm:drawend', { shape: this._shape })

    // toggle the draw button of the Toolbar in case drawing mode got disabled without the button
    this._map.pm.Toolbar.toggleButton(this.toolbarButtonName, false)

    // cleanup snapping
    if (this.options.snappable) {
      this._cleanupSnapping()
    }
  },
  enabled() {
    return this._enabled
  },
  toggle(options) {
    if (this.enabled()) {
      this.disable()
    } else {
      this.enable(options)
    }
  },
  addImage(path) {
    this._image = L.distortableImageOverlay(path, {
      selected: true,
      actions: [L.DragAction, L.ScaleAction, L.DistortAction, L.RotateAction, L.FreeRotateAction]
    }).addTo(this._map)

    this.enable()
  },
  _finishShape() {
    // disable drawing
    this.disable()

    // fire the pm:create event and pass shape and layer
    this._map.fire('pm:create', {
      shape: this._shape,
      layer: this._image
    })

    if (this.options.snappable) {
      this._cleanupSnapping()
    }
  }
})
