const _ = require('lodash')

module.exports = {
  generateSuccess (msg) {
    return {
      succeeded: true,
      errorCode: 0,
      slug: 'ok',
      message: _.defaultTo(msg, 'Operation succeeded.')
    }
  },
  generateError (err, complete = true) {
    let error = {
      succeeded: false,
      errorCode: 1,
      slug: 'Unknown',
      message: 'An unexpected error occured.'
    }

    if (err !== null) {
      error.errorCode = _.isFinite(err.code) ? err.code : 1
      error.slug = err.name

      if (error.message) {
        error.message = err.message
      }
    }

    return (complete) ? { responseResult: error } : error
  }
}
