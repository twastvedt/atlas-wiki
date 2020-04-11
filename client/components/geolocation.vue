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
    v-content.grey(:class='$vuetify.theme.dark ? `darken-4-d5` : `lighten-3`')
      l-map(
        :bounds='fitBounds'
        :options='mapOptions'
        ref='map'
        )
        l-tile-layer(
          :url='url'
          :attribution='attribution'
        )
        l-geo-json(
          :geojson='features'
          ref='features'
        )

    loader(v-model='dialogProgress', :title='$t(`editor:save.processing`)', :subtitle='$t(`editor:save.pleaseWait`)')
    nav-footer
    notify
    FeaturePopup(v-show='showPopup', ref='popup', :properties='popupProperties')
</template>

<script>
import { get } from 'vuex-pathify'
import VueRouter from 'vue-router'
import _ from 'lodash'

import tagsQuery from 'gql/common/common-pages-query-tags.gql'
import pagesQuery from 'gql/common/common-pages-query-list.gql'
import featuresQuery from 'gql/common/common-features-query-list.gql'

import createFeatureMutation from 'gql/map/create.gql'
import updateFeatureMutation from 'gql/map/update.gql'
import deleteFeatureMutation from 'gql/map/delete.gql'

import { LMap, LTileLayer, LMarker, LPopup, LTooltip, LGeoJson } from 'vue2-leaflet'
import 'leaflet-defaulticon-compatibility'

import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

import FeaturePopup from './featurePopup'

/* global siteLangs */

const router = new VueRouter({
  mode: 'history',
  base: '/g'
})

export default {
  i18nOptions: { namespaces: 'geo' },
  components: {
    LMap,
    LTileLayer,
    LMarker,
    LPopup,
    LTooltip,
    LGeoJson,
    FeaturePopup
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
      showPopup: false
    }
  },
  computed: {
    darkMode: get('site/dark'),
    tagsSelected () {
      return _.filter(this.tags, t => _.includes(this.selection, t.tag))
    },
    tagsGrouped () {
      return _.groupBy(this.tags, t => t.title.charAt(0).toUpperCase())
    },
    fitBounds() {
      return this.$refs.features?.mapObject?.getBounds()
    }
  },
  watch: {
    locale (newValue, oldValue) {
      this.rebuildURL()
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
  },
  mounted () {
    this.$nextTick(() => {
      const map = this.$refs.map.mapObject

      map.pm.addControls({
        position: 'topleft',
        drawCircle: false,
        cutPolygon: false
      })

      map.on('pm:create', e => {
        this.create(e.layer.toGeoJSON())

        // listen to changes on the new layer
        e.layer.on('pm:update', this.update)
        e.layer.on('pm:dragend', this.update)
      })

      map.on('pm:remove', e => {
        this.delete(e.layer.feature.properties.id)
      })

      map.on('layeradd', e => {
        if (e.layer.feature) {
          e.layer.bindPopup((layer) => {
            this.popupProperties = layer.feature.properties

            return this.$refs.popup.$el
          }, {
            minWidth: 200
          })
        }
      })

      map.on('popupopen', e => { this.showPopup = true })
      map.on('popupclose', e => { this.showPopup = false })

      this.$refs.features.mapObject.on('pm:update', this.update)
      this.$refs.features.mapObject.on('pm:dragend', this.update)
    })
  },
  methods: {
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
    goTo (page) {
      window.location.assign(`/${page.locale}/${page.path}`)
    },
    showProgressDialog(textKey) {
      this.dialogProgress = true
    },
    hideProgressDialog() {
      this.dialogProgress = false
    },
    async create(geojson) {
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
      update: (data) => _.cloneDeep(data.features.list),
      watchLoading (isLoading) {
        this.isLoading = isLoading
        this.$store.commit(`loading${isLoading ? 'Start' : 'Stop'}`, 'pages-refresh')
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
