module.exports = {
  PORT: process.env.PORT || 8000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  TEST_DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql: //adrianmarquis@localhost/uncorked-test',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://adrianmarquis@localhost/uncorked',
  JWT_SECRET: process.env.JWT_SECRET || 'sprechensiedeutsch',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  API_BASE_URL: process.env.REACT_APP_API_BASE_URL ||
    'http://localhost:8000/',
}