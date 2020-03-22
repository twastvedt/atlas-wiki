/* global WIKI */

const Model = require('objection').Model
const moment = require('moment')

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
}
