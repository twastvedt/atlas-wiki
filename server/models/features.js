/* global WIKI */

const Model = require('objection').Model
const moment = require('moment')
const validate = require('validate.js')
const _ = require('lodash')

/**
 * Feature model
 */
module.exports = class Feature extends Model {
  static get tableName() { return 'features' }

  static get jsonSchema () {
    return {
      type: 'object',

      properties: {
        id: {type: 'integer'},
        parentId: {type: 'integer'},
        pageId: {type: 'integer'},
        title: {type: 'string'},
        description: {type: 'string'},
        geojson: {type: 'object'},
        createdAt: {type: 'string'},
        updatedAt: {type: 'string'}
      }
    }
  }

  static get relationMappings() {
    return {
      page: {
        relation: Model.BelongsToOneRelation,
        modelClass: require('./pages'),
        join: {
          from: 'features.pageId',
          to: 'pages.id'
        }
      },
      parent: {
        relation: Model.BelongsToOneRelation,
        modelClass: Feature,
        join: {
          from: 'features.parentId',
          to: 'features.id'
        }
      }
    }
  }

  async $beforeUpdate(opt, context) {
    await super.$beforeUpdate(opt, context)

    this.updatedAt = moment.utc().toISOString()
  }
  async $beforeInsert(context) {
    await super.$beforeInsert(context)

    this.createdAt = moment.utc().toISOString()
    this.updatedAt = moment.utc().toISOString()
  }

  /**
   * Create a new feature
   *
   * @param {Object} param0 Feature Fields
   */
  static async createNewFeature ({ parentId, pageId, title, description, geojson }) {
    // Input validation
    let validation = null

    validation = validate({
      title,
      geojson
    }, {
      title: {
        length: {
          maximum: 255
        }
      },
      geojson: {
        presence: {
          allowEmpty: false
        }
      }
    }, { format: 'flat' })

    if (validation && validation.length > 0) {
      throw new WIKI.Error.InputInvalid(validation[0])
    }

    // Check if parent feature exists
    if (parentId) {
      const parentFeature = await WIKI.models.features.query().findOne({ parentId })

      if (!parentFeature) {
        throw new WIKI.Error.FeatureParentDoesNotExist()
      }
    }

    // Create the feature
    let newFeatureData = {
      parentId,
      pageId,
      title,
      description,
      geojson
    }

    await WIKI.models.features.query().insert(newFeatureData)
  }

  /**
   * Update an existing feature
   *
   * @param {Object} param0 Feature ID and fields to update
   */

  static async updateFeature ({ id, parentId, pageId, title, description, geojson }) {
    const feature = await WIKI.models.features.query().findById(id)
    if (feature) {
      let featureData = {}
      if (!_.isEmpty(parentId) && parentId !== feature.parentId) {
        featureData.parentId = parentId
      }
      if (!_.isEmpty(title) && title !== feature.title) {
        featureData.title = _.trim(title)
      }
      if (_.isFinite(pageId)) {
        featureData.pageId = pageId
      }
      if (!_.isEmpty(geojson)) {
        featureData.geojson = geojson
      }
      if (description !== null) {
        featureData.description = description
      }
      await WIKI.models.features.query().patch(featureData).findById(id)
    } else {
      throw new WIKI.Error.FeatureNotFound()
    }
  }

  /**
   * Delete a Feature
   *
   * @param {*} id Feature ID
   */
  static async deleteFeature (id) {
    const feature = await WIKI.models.features.query().findById(id)
    if (feature) {
      await WIKI.models.features.query().deleteById(id)
    } else {
      throw new WIKI.Error.FeatureNotFound()
    }
  }
}
