<template lang='pug'>
  v-form(:dark='darkMode').featurePopup
    v-subheader {{properties.id}}
    v-text-field(dense, label="Title", v-model="properties.title")
    v-text-field(dense, label="Description", v-model="properties.description")
</template>

<script>
import { get } from 'vuex-pathify'
import _ from 'lodash'

import updateFeatureMutation from 'gql/map/update.gql'

/* global siteLangs */

export default {
  i18nOptions: { namespaces: 'geo' },
  data() {
    return {
      locales: []
    }
  },
  props: {
    properties: {
      type: Object,
      default: () => { return {} }
    }
  },
  computed: {
    darkMode: get('site/dark')
  },
  created () {
    // this.locales = _.concat(
    //   [{name: this.$t('geo:localeAny'), code: 'any'}],
    //   (siteLangs.length > 0 ? siteLangs : [])
    // )
  },
  methods: {
    async update(event) {
      try {
        let resp = await this.$apollo.mutate({
          mutation: updateFeatureMutation,
          variables: {
            id: this.properties.id,
            title: this.properties.title,
            description: this.properties.description
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
    }
  },
  apollo: {
  }
}
</script>

<style lang='scss'>

</style>
