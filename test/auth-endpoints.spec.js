const knex = require('knex');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const helpers = require('./test-helpers');

describe('Auth Endpoints', function() {
    let db

    const { testUsers } = helpers.makeUsersFixtures()
    const testUser = testUsers[0]

    before('make knex instance', () => {
        db = knex({
        client: 'pg',
        connection: process.env.TEST_DATABASE_URL,
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    before('cleanup', () => helpers.cleanTables(db))

    afterEach('cleanup', () => helpers.cleanTables(db))

    describe(`POST /auth/login`, () => {
        beforeEach('insert users', () =>
            helpers.seedUsers(
                db,
                testUsers,
            )
        )

    const requiredFields = ['username', 'password']

        requiredFields.forEach(field => {
            const loginAttemptBody = {
                username: testUser.username,
                password: testUser.password,
            }

            it(`responds with 400 required error when '${field}' is missing`, () => {
                delete loginAttemptBody[field]

                return supertest(app)
                .post('/auth/login')
                .send(loginAttemptBody)
                .expect(400, {
                    error: `Missing '${field}' in request body`,
                })
            })
        })
            it(`responds 400 'invalid username or password' when bad username`, () => {
                const userInvalidUsername = { username: 'username-not', password: 'existy' }
                return supertest(app)
                .post('/auth/login')
                .send(userInvalidUsername)
                .expect(400, { error: `incorrect username or password` })
            })
            it(`responds 400 'invalid username or password' when bad password`, () => {
                const userInvalidPass = { username: testUser.username, password: 'incorrect' }
                return supertest(app)
                .post('/auth/login')
                .send(userInvalidPass)
                .expect(400, { error: `incorrect username or password` })
            })
            it(`responds 200 and a JWT auth token plus the user when valid credentials`, () => {
                const userValidCreds = {
                  username: testUser.username,
                  password: testUser.password,
                }
                const expectedToken = jwt.sign(
                  { user_id: testUser.user_id },
                  process.env.JWT_SECRET,
                  {
                    subject: `${testUser.username}`,
                    algorithm: 'HS256',
                  }
                )
                return supertest(app)
                  .post('/auth/login')
                  .send(userValidCreds)
                  .expect(200)
                  .expect(res => {
                    expect(res.body.authToken).to.eql(expectedToken)
                    expect(res.body.user.user_id).to.eql(testUser.user_id)
                    expect(res.body.user.username).to.eql(testUser.username)
                  })
              })
    })
})