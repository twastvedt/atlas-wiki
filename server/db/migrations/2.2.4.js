/* global WIKI */

exports.up = knex => {
  return knex.schema
    .createTable('features', table => {
      table.increments('id').primary()
      table.integer('parentId')
      table.string('title').notNullable()
      table.jsonb('geojson').notNullable()
      table.string('createdAt').notNullable()
      table.string('updatedAt').notNullable()
    })
}

exports.down = knex => { }
