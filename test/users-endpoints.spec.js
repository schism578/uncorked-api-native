const knex = require('knex')
const bcrypt = require('bcryptjs')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Users Endpoints', function() {
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

    describe(`POST /user`, () => {
        context(`User Validation`, () => {
        beforeEach('insert users', () =>
            helpers.seedUsers(
            db,
            testUsers,
            )
        )

        const requiredFields = ['username', 'password']

        requiredFields.forEach(field => {
            const registerAttemptBody = {
            username: 'test username',
            password: 'test password'
            }

            it(`responds with 400 required error when '${field}' is missing`, () => {
            delete registerAttemptBody[field]

            return supertest(app)
                .post('/user')
                .send(registerAttemptBody)
                .expect(400, {
                error: `missing '${field}' in request body`,
                })
            })
        })
            it(`responds 400 'password must be longer than 8 characters' when empty password`, () => {
                const userShortPassword = {
                    username: 'test username',
                    password: '1234567'
                }
                return supertest(app)
                .post('/user')
                .send(userShortPassword)
                .expect(400, { error: `password must be at least 8 characters` })
            })
            it(`responds 400 'password must be less than 72 characters' when long password`, () => {
                const userLongPassword = {
                    username: 'test username',
                    password: '*'.repeat(73)
                }
                return supertest(app)
                    .post('/user')
                    .send(userLongPassword)
                    .expect(400, { error: `password must be less than 72 characters` })
            })
            it(`responds 400 error when password starts with spaces`, () => {
                const userPasswordStartsSpaces = {
                    username: 'test username',
                    password: ' 1Aa!2Bb@'
                }
                return supertest(app)
                    .post('/user')
                    .send(userPasswordStartsSpaces)
                    .expect(400, { error: `password must not start or end with empty spaces` })
            })
            it(`responds 400 error when password ends with spaces`, () => {
                const userPasswordEndsSpaces = {
                    username: 'test username',
                    password: '1Aa!2Bb@ '
                }
                return supertest(app)
                    .post('/user')
                    .send(userPasswordEndsSpaces)
                    .expect(400, { error: `password must not start or end with empty spaces` })
            })
            it(`responds 400 error when password isn't complex enough`, () => {
                const userPasswordNotComplex = {
                    username: 'test username',
                    password: '11AAaabb'
                }
                return supertest(app)
                  .post('/user')
                  .send(userPasswordNotComplex)
                  .expect(400, { error: `password must contain one upper case, lower case, number and special character` })
              })

              it(`responds 400 'username already taken' when username isn't unique`, () => {
                const duplicateUser = {
                    username: testUser.username,
                    password: '11AAaa!!'
                }
                return supertest(app)
                  .post('/user')
                  .send(duplicateUser)
                  .expect(400, { error: `username already taken` })
              })
            })

            context(`Happy path`, () => {
              it(`responds 201 with an authToken and the serialized user`, () => {
                const newUser = {
                    username: 'a brand new username',
                    password: '1Aa!2Bb@'
                }
                return supertest(app)
                  .post('/user')
                  .send(newUser)
                  .expect(201)
                  .expect(res => {
                    expect(res.body).to.have.property('authToken')
                    expect(res.body.user.username).to.eql(newUser.username)
                    expect(res.body.user).to.have.property('user_id')
                    expect(res.headers.location).to.eql(`/user/${res.body.user.user_id}`)
                  })
                  .expect(res =>
                    db
                      .from('user_info')
                      .select('*')
                      .where({ user_id: res.body.user.user_id })
                      .first()
                      .then(row => {
                        expect(row.username).to.eql(newUser.username)
                        return bcrypt.compare(newUser.password, row.password)
                      })
                      .then(compareMatch => {
                        expect(compareMatch).to.be.true
                      })
                    )
                })
            })
        })
})
