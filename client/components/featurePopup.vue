<template lang='pug'>
  v-form(:dark='darkMode').featurePopup
    a(href='', v-show='!editMode && isPage', @click='goTo()') {{localProperties.title}}
    v-autocomplete(dense, label='Page', v-show='editMode', v-model='localProperties.page', :items='pages', item-text='title', clearable=true)
    v-text-field(dense, label='Title', :disabled='!editMode', v-model='localProperties.title', v-show='!isPage')
    v-text-field(dense, label='Description', :disabled='!editMode', v-model='localProperties.description', v-show='!isPage')
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
      return this.localProperties && (this.localProperties.page || this.localProperties.pagePath)
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
      const page = this.localProperties.page

      if (page) {
        this.localProperties.title = page.title
        this.localProperties.description = page.description
        this.localProperties.pagePath = this.pagePath(page)
      }

      this.$emit('save', this.localProperties)
      this.editMode = false
    },
    edit () {
      this.editMode = true
    },
    pagePath(page) {
      return `/${page.locale}/${page.path}`
    },
    goTo () {
      if (this.isPage) {
        window.location.assign(this.pagePath(this.localProperties.page))
      } else if (this.localProperties.pagePath) {
        window.location.assign(this.localProperties.pagePath)
      }
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
      },
      variables () {
        return {
          locale: this.locale === 'any' ? null : this.locale,
          tags: this.selection
        }
      }
    }
  }
}
</script>

<style lang='scss'>

</style>
