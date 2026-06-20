const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Pairing Endpoints', function () {
    let db

    const { testUsers } = helpers.makeUsersFixtures()
    const testUser = testUsers[0]
    const otherUser = testUsers[1]
    const { testWines } = helpers.makeWineFixtures()
    const testWine = { ...testWines[0], user_id: testUser.user_id }

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

    beforeEach('seed users and a wine', () =>
        helpers.seedUsers(db, testUsers)
            .then(() => helpers.seedWines(db, [testWine]))
    )

    describe(`GET /pairing/:user_id`, () => {
        context(`Given no pairings`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get(`/pairing/${testUser.user_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .expect(200, [])
            })
        })

        context(`Given pairings exist`, () => {
            const { testPairings } = helpers.makePairingFixtures()

            beforeEach('insert pairings', () =>
                helpers.seedPairings(db, testPairings)
            )

            it(`responds with 200 and all pairings for the user`, () => {
                return supertest(app)
                    .get(`/pairing/${testUser.user_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .expect(200)
                    .expect(res => {
                        expect(res.body).to.have.length(testPairings.length)
                    })
            })

            it(`filters by wine_id when provided`, () => {
                return supertest(app)
                    .get(`/pairing/${testUser.user_id}?wine_id=${testWine.wine_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .expect(200)
                    .expect(res => {
                        expect(res.body).to.have.length(testPairings.length)
                        res.body.forEach(p => expect(p.wine_id).to.eql(testWine.wine_id))
                    })
            })
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .get(`/pairing/${otherUser.user_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(403)
        })
    })

    describe(`POST /pairing/:user_id`, () => {
        it(`creates a pairing, responding with 201 and the new pairing`, () => {
            const newPairing = {
                wine_id: testWine.wine_id,
                food_type: 'dish',
                name: 'Baked Brie',
                notes: 'goes great with this wine',
            }
            return supertest(app)
                .post(`/pairing/${testUser.user_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send(newPairing)
                .expect(201)
                .expect(res => {
                    expect(res.body.wine_id).to.eql(newPairing.wine_id)
                    expect(res.body.food_type).to.eql(newPairing.food_type)
                    expect(res.body.name).to.eql(newPairing.name)
                    expect(res.body.notes).to.eql(newPairing.notes)
                    expect(res.body.source).to.eql('user_added')
                    expect(res.body.user_id).to.eql(testUser.user_id)
                    expect(res.body).to.have.property('pairing_id')
                })
        })

        const requiredFields = ['wine_id', 'food_type', 'name']

        requiredFields.forEach(field => {
            const newPairing = {
                wine_id: 1,
                food_type: 'cheese',
                name: 'Brie',
            }

            it(`responds with 400 and an error message when '${field}' is missing`, () => {
                delete newPairing[field]
                return supertest(app)
                    .post(`/pairing/${testUser.user_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .send(newPairing)
                    .expect(400, {
                        error: { message: `missing '${field}' in request body` }
                    })
            })
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .post(`/pairing/${otherUser.user_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send({ wine_id: testWine.wine_id, food_type: 'cheese', name: 'Brie' })
                .expect(403)
        })
    })

    describe(`DELETE /pairing/:user_id/:pairing_id`, () => {
        const { testPairings } = helpers.makePairingFixtures()

        beforeEach('insert pairings', () =>
            helpers.seedPairings(db, testPairings)
        )

        it(`responds with 204 and removes the pairing`, () => {
            const pairingToDelete = testPairings[0]
            return supertest(app)
                .delete(`/pairing/${testUser.user_id}/${pairingToDelete.pairing_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(204)
                .then(() =>
                    db.from('food_pairing').select('*').where('pairing_id', pairingToDelete.pairing_id).first()
                        .then(row => expect(row).to.be.undefined)
                )
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .delete(`/pairing/${otherUser.user_id}/${testPairings[0].pairing_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(403)
        })

        it(`responds with 404 when the pairing doesn't exist`, () => {
            return supertest(app)
                .delete(`/pairing/${testUser.user_id}/999999`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(404)
        })
    })
})
