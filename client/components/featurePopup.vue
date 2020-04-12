<template lang='pug'>
  v-form(:dark='darkMode').featurePopup
    div(v-show='!editMode && isPage')
      v-chip(d-block, :color='$vuetify.theme.dark ? `grey darken-3-l5` : `grey lighten-4`', :href='pagePath()').overline {{localProperties.title}}
    v-autocomplete(dense, label='Page', v-show='editMode', v-model='localProperties.pageId', :items='pages', item-text='title', item-value='id', clearable=true)
    v-btn(small, link, @click='newPage', v-show='editMode')
      v-icon(dense) mdi-plus
    v-text-field(dense, label='Title', :readonly='!editMode', v-model='localProperties.title', v-show='!isPage')
    v-text-field(dense, label='Description', :readonly='!editMode', v-model='localProperties.description', v-show='!isPage')
    v-btn(small, @click='save', v-show='editMode') {{ $t(`geo:save`) }}
    v-btn(small, @click='edit', v-show='!editMode') {{ $t(`geo:edit`) }}
</template>

<script>
import { get } from 'vuex-pathify'
import _ from 'lodash'

import pagesQuery from 'gql/map/pages-query-list.gql'

/* global siteLangs */

export default {
  i18nOptions: { namespaces: 'geo' },
  data() {
    return {
      locales: [],
      pages: [],
      localProperties: {...this.properties},
      editMode: false
    }
  },
  props: {
    properties: {
      type: Object,
      default: () => { return {} }
    }
  },
  computed: {
    darkMode: get('site/dark'),
    isPage () {
      return this.localProperties && (this.localProperties.pageId || this.localProperties.pagePath)
    }
  },
  watch: {
    properties(newValue) {
      this.localProperties = {...newValue}
      this.editMode = false
    }
  },
  created () {
    this.locales = _.concat(
      [{name: this.$t('geo:localeAny'), code: 'any'}],
      (siteLangs.length > 0 ? siteLangs : [])
    )
  },
  methods: {
    save () {
      const saveData = {id: this.localProperties.id}

      if (this.localProperties.pageId) {
        const page = this.pages.find(p => p.id === this.localProperties.pageId)

        saveData.title = page.title
        saveData.description = page.description
        saveData.pageId = page.id
        saveData.pagePath = this.pagePath(page)
      } else {
        saveData.title = this.localProperties.title
        saveData.description = this.localProperties.description
      }

      this.$emit('save', saveData)
      this.editMode = false
    },
    edit () {
      this.editMode = true
    },
    pagePath(page) {
      if (page) {
        return `/${page.locale}/${page.path}`
      } else if (this.localProperties.pagePath) {
        return this.localProperties.pagePath
      } else if (this.localProperties.pageId) {
        page = this.pages.find(p => p.id === this.localProperties.pageId)

        return `/${page.locale}/${page.path}`
      }
    },
    newPage() {
      let pageName

      if (this.localProperties.title) {
        pageName = this.localProperties.title
      } else {
        pageName = 'new-page'
      }

      window.location.assign(`/e/${pageName}?title=${pageName};featureId=${this.localProperties.id}`)
    }
  },
  apollo: {
    pages: {
      query: pagesQuery,
      fetchPolicy: 'cache-and-network',
      update: (data) => _.cloneDeep(data.pages.list),
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
