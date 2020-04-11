exports.up = knex => {
  return knex.schema
    .createTable('features', table => {
      table.increments('id').primary()
      table.integer('parentId').unsigned()
      table.string('title')
      table.string('description')
      table.integer('pageId').unsigned()
      table.jsonb('geojson').notNullable()
      table.string('createdAt').notNullable()
      table.string('updatedAt').notNullable()

      table.foreign('pageId').references('pages.id').onUpdate('CASCADE').onDelete('SET DEFAULT')
      table.foreign('parentId').references('features.id').onUpdate('CASCADE').onDelete('SET DEFAULT')
    })
}

exports.down = knex => {
  return knex.schema
    .dropTable('features')
}
