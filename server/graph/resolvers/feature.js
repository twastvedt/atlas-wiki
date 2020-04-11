const GraphQLJSONObject = require('graphql-type-json').GraphQLJSONObject
const graphHelper = require('../../helpers/graph')
const _ = require('lodash')

/* global WIKI */

function formatFeature(feature) {
  if (!feature.geojson.properties) {
    feature.geojson.properties = _.clone(feature)
  } else {
    _.extend(feature.geojson.properties, feature)
  }

  delete feature.geojson.properties.geojson

  return feature.geojson
}

module.exports = {
  JSONObject: GraphQLJSONObject,
  Query: {
    async features() { return {} }
  },
  Mutation: {
    async features() { return {} }
  },
  FeatureQuery: {
    async list(obj, args, context, info) {
      const results = await WIKI.models.features.query()
        .select('id', 'parentId', 'title', 'description', 'geojson', 'createdAt', 'updatedAt')
        .modify(queryBuilder => {
          if (args.parentId) {
            queryBuilder.where('parentId', args.parentId)
          }
        })

      return results.map(formatFeature)
    },
    async single(obj, args, context, info) {
      let feature = await WIKI.models.features.query().findById(args.id)
      return formatFeature(feature)
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
        await WIKI.models.features.updateFeature(args)

        return {
          responseResult: graphHelper.generateSuccess('Feature updated successfully')
        }
      } catch (err) {
        return graphHelper.generateError(err)
      }
    }
  }
}
