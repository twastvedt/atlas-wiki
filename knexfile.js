// Update with your config settings.

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'db',
      database: 'wiki',
      user:     'wikijs',
      password: 'wikijsrocks'
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      tableName: 'migrations',
      directory: 'server/db/migrations'
    }
  }
};
