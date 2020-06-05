<template lang='pug'>
  v-app(:dark='darkMode').geolocation
    nav-header
    v-navigation-drawer.pb-0.elevation-1(app, fixed, clipped, :right='$vuetify.rtl', permanent, width='300')
      vue-scroll(:ops='scrollStyle')
        v-list(dense, nav)
          v-list-item(href='/')
            v-list-item-icon: v-icon mdi-home
            v-list-item-title {{$t('common:header.home')}}
          template(v-for='(tags, groupName) in tagsGrouped')
            v-divider.my-2
            v-subheader.pl-4(:key='`tagGroup-` + groupName') {{groupName}}
            v-list-item(v-for='tag of tags', @click='toggleTag(tag.tag)', :key='`tag-` + tag.tag')
              v-list-item-icon
                v-icon(v-if='isSelected(tag.tag)', color='primary') mdi-checkbox-intermediate
                v-icon(v-else) mdi-checkbox-blank-outline
              v-list-item-title {{tag.title}}
    v-content
      l-map(
        :bounds='fitBounds'
        :options='mapOptions'
        ref='map'
        )
        l-tile-layer(
          :url='url'
          :attribution='attribution'
        )
      component(:is='activeModal', class='modal')

    loader(v-model='dialogProgress', :title='$t(`editor:save.processing`)', :subtitle='$t(`editor:save.pleaseWait`)')
    nav-footer
    notify

    FeaturePopup(v-show='showPopup', ref='popup', :properties='popupProperties', @save='popupSave')

    div(ref='tooltip')
      v-chip(small, label, :color='$vuetify.theme.dark ? `grey darken-3-l5` : `grey lighten-4`' v-show='popupProperties.pageId').overline {{popupProperties.title}}
      p(font-weight-bold, v-show='!popupProperties.pageId') {{popupProperties.title}}
      p(v-show='popupProperties.description') {{popupProperties.description}}
</template>

<script>
import { get, sync } from 'vuex-pathify'
import VueRouter from 'vue-router'
import _ from 'lodash'

import tagsQuery from 'gql/common/common-pages-query-tags.gql'
import pagesQuery from 'gql/common/common-pages-query-list.gql'

import featuresQuery from 'gql/map/features-query-list.gql'
import createFeatureMutation from 'gql/map/create.gql'
import updateFeatureMutation from 'gql/map/update.gql'
import deleteFeatureMutation from 'gql/map/delete.gql'

import L from 'leaflet'
import { LMap, LTileLayer, LMarker, LPopup, LTooltip } from 'vue2-leaflet'
import 'leaflet-defaulticon-compatibility'
import 'leaflet-toolbar'

import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

import placeImage from './PlaceImage'
import { GeoJSONWithImage } from './GeoJSONWithImage'

import FeaturePopup from './featurePopup'

import editorStore from '../store/editor'

/* global WIKI */
/* global siteLangs */

WIKI.$store.registerModule('editor', editorStore)

const router = new VueRouter({
  mode: 'history',
  base: '/g'
})

export default {
  i18nOptions: { namespaces: ['geo', 'editor'] },
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    LTooltip,
    FeaturePopup,
    editorModalMedia: () => import(/* webpackChunkName: "editor", webpackMode: "eager" */ './editor/editor-modal-media.vue')
  },
  data() {
    return {
      tags: [],
      selection: [],
      innerSearch: '',
      locale: 'any',
      locales: [],
      pages: [],
      features: [],
      featuresLayer: null,
      dialogProgress: false,
      isLoading: true,
      scrollStyle: {
        vuescroll: {},
        scrollPanel: {
          initialScrollY: 0,
          initialScrollX: 0,
          scrollingX: false,
          easing: 'easeOutQuad',
          speed: 1000,
          verticalNativeBarPos: this.$vuetify.rtl ? `left` : `right`
        },
        rail: {
          gutterOfEnds: '2px'
        },
        bar: {
          onlyShowBarOnScroll: false,
          background: '#CCC',
          hoverStyle: {
            background: '#999'
          }
        }
      },
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
      mapOptions: {
        zoomSnap: 0.5
      },
      popupProperties: {},
      popupFeature: null,
      showPopup: false
    }
  },
  computed: {
    darkMode: get('site/dark'),
    activeModal: sync('editor/activeModal'),
    editorKey: sync('editor/editorKey'),
    tagsSelected () {
      return _.filter(this.tags, t => _.includes(this.selection, t.tag))
    },
    tagsGrouped () {
      return _.groupBy(this.tags, t => t.title.charAt(0).toUpperCase())
    },
    fitBounds() {
      return this.featuresLayer?.mapObject?.getBounds()
    }
  },
  watch: {
    locale (newValue, oldValue) {
      this.rebuildURL()
    },
    features (newValue, oldValue) {
      const map = this.$refs.map.mapObject

      this.featuresLayer = new GeoJSONWithImage(newValue)

      map.addLayer(this.featuresLayer)
    }
  },
  router,
  created () {
    this.$store.commit('page/SET_MODE', 'geolocation')

    this.locales = _.concat(
      [{name: this.$t('geo:localeAny'), code: 'any'}],
      (siteLangs.length > 0 ? siteLangs : [])
    )

    this.selection = _.compact(this.$route.path.split('/'))

    this.editorKey = 'common'

    console.debug('geolocation created')
  },
  mounted () {
    this.$nextTick(() => {
      const map = this.$refs.map.mapObject

      const geolocationThis = this

      const newToolbar = L.PM.Toolbar.extend({
        _defineButtons: function() {
          L.PM.Toolbar.prototype._defineButtons.call(this)

          const placeImageButton = {
            className: 'control-icon leaflet-pm-icon-image',
            title: geolocationThis.$t('geo:placeImageButton'),
            jsClass: 'Image',
            onClick: () => {},
            afterClick: () => geolocationThis.toggleModal('editorModalMedia'),
            doToggle: true,
            toggleStatus: false,
            disableOtherButtons: false,
            position: this.options.position,
            actions: ['finish', 'cancel']
          }

          this._addButton('placeImage', new L.Control.PMButton(placeImageButton))
        },
        applyIconStyle() {
          L.PM.Toolbar.prototype.applyIconStyle.call(this)

          const imageButton = this.buttons['placeImage']

          L.Util.setOptions(imageButton, {
            className: 'control-icon leaflet-pm-icon-image'
          })
        }
      })

      newToolbar.prototype.options.placeImage = true

      map.pm.Toolbar = new newToolbar(map)

      map.pm.addControls({
        position: 'topleft',
        drawCircle: false,
        cutPolygon: false
      })

      map.pm.Draw.Image = new placeImage(map)

      map.on('pm:create', e => {
        this.create(e.layer)

        this.setUpLayer(e.layer)
      })

      map.on('pm:remove', e => {
        this.delete(e.layer.feature.properties.id)
      })

      map.on('pm:globaleditmodetoggled', e => {
        this.featuresLayer.eachLayer(layer => {
          if (layer instanceof L.DistortableImageOverlay) {
            if (e.enabled) {
              layer.editing.enable()
            } else {
              layer.editing.disable()
            }
          }
        })
      })

      map.on('layeradd', e => {
        if (e.layer.feature) {
          this.setUpLayer(e.layer)
        }
      })

      map.on('popupopen', e => { this.showPopup = true })
      map.on('popupclose', e => { this.showPopup = false })

      this.$root.$on('editorInsert', opts => {
        if (opts.kind === 'IMAGE') {
          map.pm.Draw.Image.addImage(opts.path)
        }
      })
    })
  },
  methods: {
    toggleModal(key) {
      this.activeModal = (this.activeModal === key) ? '' : key
    },
    setUpLayer(layer) {
      const feature = layer.feature

      // listen to changes on the new layer
      layer.on('pm:update', this.update)
      layer.on('pm:dragend', this.update)
      layer.on('edit', this.update)

      layer.bindPopup((l) => {
        l.unbindTooltip()

        this.popupProperties = feature.properties
        this.popupFeature = feature

        return this.$refs.popup.$el
      }, {
        minWidth: 200
      })

      layer.on('mouseover', () => {
        layer.unbindTooltip()

        if (feature.properties.title && !layer.isPopupOpen()) {
          this.popupProperties = feature.properties

          layer.bindTooltip(this.$refs.tooltip).openTooltip()
        }
      })
    },
    async popupSave (properties) {
      try {
        const saveData = {id: properties.id}

        if (properties.pageId !== undefined) {
          saveData.pageId = properties.pageId
        } else {
          saveData.title = properties.title
          saveData.description = properties.description
        }

        let resp = await this.$apollo.mutate({
          mutation: updateFeatureMutation,
          variables: saveData
        })
        resp = _.get(resp, 'data.features.update', {})
        if (!_.get(resp, 'responseResult.succeeded')) {
          throw new Error(_.get(resp, 'responseResult.message'))
        }

        _.assign(this.popupProperties, properties)
      } catch (err) {
        this.$store.commit('showNotification', {
          message: err.message,
          style: 'error',
          icon: 'warning'
        })
        throw err
      }

      this.$refs.map.mapObject.closePopup()
    },
    toggleTag (tag) {
      if (_.includes(this.selection, tag)) {
        this.selection = _.without(this.selection, tag)
      } else {
        this.selection.push(tag)
      }
      this.rebuildURL()
    },
    isSelected (tag) {
      return _.includes(this.selection, tag)
    },
    rebuildURL () {
      let urlObj = {
        path: '/' + this.selection.join('/')
      }
      if (this.locale !== `any`) {
        _.set(urlObj, 'query.lang', this.locale)
      }
      if (this.orderBy !== `TITLE`) {
        _.set(urlObj, 'query.sort', this.orderBy.toLowerCase())
      }
      if (this.orderByDirection !== 0) {
        _.set(urlObj, 'query.dir', this.orderByDirection === 0 ? `asc` : `desc`)
      }
      this.$router.push(urlObj)
    },
    showProgressDialog(textKey) {
      this.dialogProgress = true
    },
    hideProgressDialog() {
      this.dialogProgress = false
    },
    async create(layer) {
      const geojson = layer.toGeoJSON()

      layer.feature = geojson

      this.showProgressDialog('saving')
      try {
        let resp = await this.$apollo.mutate({
          mutation: createFeatureMutation,
          variables: {
            geojson
          }
        })
        resp = _.get(resp, 'data.features.create', {})
        if (!_.get(resp, 'responseResult.succeeded')) {
          throw new Error(_.get(resp, 'responseResult.message'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          message: err.message,
          style: 'error',
          icon: 'warning'
        })
        throw err
      }
      this.hideProgressDialog()
    },
    async update(event) {
      this.showProgressDialog('saving')
      try {
        const data = _.clone(event.sourceTarget.toGeoJSON())
        data.properties = _.cloneDeep(data.properties)

        delete data.properties.id

        let resp = await this.$apollo.mutate({
          mutation: updateFeatureMutation,
          variables: {
            id: event.sourceTarget.feature.properties.id,
            geojson: data
          }
        })
        resp = _.get(resp, 'data.features.update', {})
        if (!_.get(resp, 'responseResult.succeeded')) {
          throw new Error(_.get(resp, 'responseResult.message'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          message: err.message,
          style: 'error',
          icon: 'warning'
        })
        throw err
      }
      this.hideProgressDialog()
    },
    async delete(id) {
      this.showProgressDialog('saving')
      try {
        let resp = await this.$apollo.mutate({
          mutation: deleteFeatureMutation,
          variables: {
            id
          }
        })
        resp = _.get(resp, 'data.features.delete', {})
        if (!_.get(resp, 'responseResult.succeeded')) {
          throw new Error(_.get(resp, 'responseResult.message'))
        }
      } catch (err) {
        this.$store.commit('showNotification', {
          message: err.message,
          style: 'error',
          icon: 'warning'
        })
        throw err
      }
      this.hideProgressDialog()
    }
  },
  apollo: {
    tags: {
      query: tagsQuery,
      fetchPolicy: 'cache-and-network',
      update: (data) => _.cloneDeep(data.pages.tags),
      watchLoading (isLoading) {
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'tags-refresh')
      }
    },
    pages: {
      query: pagesQuery,
      fetchPolicy: 'cache-and-network',
      update: (data) => _.cloneDeep(data.pages.list),
      watchLoading (isLoading) {
        this.isLoading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'pages-refresh')
      },
      variables () {
        return {
          locale: this.locale === 'any' ? null : this.locale,
          tags: this.selection
        }
      }
    },
    features: {
      query: featuresQuery,
      fetchPolicy: 'cache-and-network',
      update: (data) => _.cloneDeep(data.features.listAsGeoJson),
      watchLoading (isLoading) {
        this.isLoading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'pages-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>
.v-content .modal {
  z-index: 10000;
}
.leaflet-pm-toolbar .leaflet-pm-icon-image {
  background-image: url('../static/svg/mdi-image-outline.svg');
}
ul.leaflet-popup-toolbar {
  padding: 0;
}
</style>
