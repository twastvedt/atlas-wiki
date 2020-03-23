const graphHelper = require('../../helpers/graph')

/* global WIKI */

module.exports = {
  Query: {
    async features() { return {} }
  },
  Mutation: {
    async features() { return {} }
  },
  FeatureQuery: {
    async list(obj, args, context, info) {
      return WIKI.models.features.query()
        .select('id', 'parentId', 'title', 'description', 'geojson', 'createdAt', 'updatedAt')
        .modify(queryBuilder => {
          if (args.parentId) {
            queryBuilder.where('parentId', args.parentId)
          }
        })
    },
    async single(obj, args, context, info) {
      let usr = await WIKI.models.features.query().findById(args.id)
      return usr
    }
  },
  FeatureMutation: {
    async create (obj, args) {
      try {
        await WIKI.models.features.createNewFeature(args)

        return {
          responseResult: graphHelper.generateSuccess('Feature created successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    },
    async delete (obj, args) {
      try {
        await WIKI.models.features.deleteFeature(args.id)
        return {
          responseResult: graphHelper.generateSuccess('Feature deleted successfully')
        }
      } catch (err) {
        if (err.message.indexOf('foreign') >= 0) {
          return graphHelper.generateError(new WIKI.Error.FeatureDeleteForeignConstraint())
        } else {
          return graphHelper.generateError(err)
        }
      }
    },
    async update (obj, args) {
      try {
        await WIKI.models.users.updateFeature(args)

        return {
          responseResult: graphHelper.generateSuccess('Feature created successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
