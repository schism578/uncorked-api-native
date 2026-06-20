const knex = require('knex')
const app = require('../src/app')
const helpers = require('./test-helpers')

describe('Wine Endpoints', function () {
    let db

    const { testUsers } = helpers.makeUsersFixtures()
    const testUser = testUsers[0]
    const otherUser = testUsers[1]

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

    beforeEach('seed users', () => helpers.seedUsers(db, testUsers))

    describe(`GET /wine/:user_id`, () => {
        context(`Given no wine`, () => {
            it(`responds with 200 and an empty list`, () => {
                return supertest(app)
                    .get(`/wine/${testUser.user_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .expect(200, [])
            })
        })

        context('Given there are wines in the database', () => {
            const testWine = { ...helpers.makeWineArray()[0], user_id: testUser.user_id }

            beforeEach('insert wine', () => helpers.seedWines(db, [testWine]))

            it('responds with 200 and all of the wine for that user', () => {
                return supertest(app)
                    .get(`/wine/${testUser.user_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .expect(200, [testWine])
            })
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .get(`/wine/${otherUser.user_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(403)
        })
    })

    describe(`POST /wine/:user_id`, () => {
        it(`creates a wine, responding with 201 and the new wine`, () => {
            const newWine = {
                winemaker: 'winemaker_1',
                wine_type: 'wine_type_1',
                wine_name: 'wine_name_1',
                varietal: 'varietal_1',
                vintage: 2020,
                region: 'region_1',
                tasting_notes: 'tasting_notes_1',
                rating: 1,
                img_url: 'img_url_1',
            }
            return supertest(app)
                .post(`/wine/${testUser.user_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send(newWine)
                .expect(201)
                .expect(res => {
                    expect(res.body.winemaker).to.eql(newWine.winemaker)
                    expect(res.body.wine_type).to.eql(newWine.wine_type)
                    expect(res.body.wine_name).to.eql(newWine.wine_name)
                    expect(res.body.varietal).to.eql(newWine.varietal)
                    expect(res.body.vintage).to.eql(newWine.vintage)
                    expect(res.body.region).to.eql(newWine.region)
                    expect(res.body.tasting_notes).to.eql(newWine.tasting_notes)
                    expect(res.body.rating).to.eql(newWine.rating)
                    expect(res.body.img_url).to.eql(newWine.img_url)
                    expect(res.body.user_id).to.eql(testUser.user_id)
                    expect(res.body).to.have.property('wine_id')
                    expect(res.headers.location).to.eql(`/wine/${testUser.user_id}/${res.body.wine_id}`)
                })
        })

        const requiredFields = ['winemaker', 'wine_type', 'wine_name', 'varietal', 'vintage', 'region', 'tasting_notes', 'rating', 'img_url']

        requiredFields.forEach(field => {
            const newWine = {
                winemaker: 'winemaker_1',
                wine_type: 'wine_type_1',
                wine_name: 'wine_name_1',
                varietal: 'varietal_1',
                vintage: 2020,
                region: 'region_1',
                tasting_notes: 'tasting_notes_1',
                rating: 1,
                img_url: 'img_url_1',
            }

            it(`responds with 400 and an error message when '${field}' is missing`, () => {
                delete newWine[field]
                return supertest(app)
                    .post(`/wine/${testUser.user_id}`)
                    .set('Authorization', helpers.makeAuthHeader(testUser))
                    .send(newWine)
                    .expect(400, {
                        error: { message: `missing '${field}' in request body` }
                    })
            })
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .post(`/wine/${otherUser.user_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send({
                    winemaker: 'w', wine_type: 'w', wine_name: 'w', varietal: 'w',
                    vintage: 2020, region: 'w', tasting_notes: 'w', rating: 1, img_url: '',
                })
                .expect(403)
        })
    })

    describe(`PATCH /wine/:user_id/:wine_id`, () => {
        const testWine = { ...helpers.makeWineArray()[0], user_id: testUser.user_id }

        beforeEach('insert wine', () => helpers.seedWines(db, [testWine]))

        it(`updates the wine and responds with 200 and the updated wine`, () => {
            return supertest(app)
                .patch(`/wine/${testUser.user_id}/${testWine.wine_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send({ rating: 5 })
                .expect(200)
                .expect(res => {
                    expect(res.body.wine_id).to.eql(testWine.wine_id)
                    expect(res.body.rating).to.eql(5)
                    expect(res.body.winemaker).to.eql(testWine.winemaker)
                })
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .patch(`/wine/${otherUser.user_id}/${testWine.wine_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send({ rating: 5 })
                .expect(403)
        })

        it(`responds with 404 when the wine doesn't exist`, () => {
            return supertest(app)
                .patch(`/wine/${testUser.user_id}/999999`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .send({ rating: 5 })
                .expect(404)
        })
    })

    describe(`DELETE /wine/:user_id/:wine_id`, () => {
        const testWine = { ...helpers.makeWineArray()[0], user_id: testUser.user_id }

        beforeEach('insert wine', () => helpers.seedWines(db, [testWine]))

        it(`responds with 204 and removes the wine`, () => {
            return supertest(app)
                .delete(`/wine/${testUser.user_id}/${testWine.wine_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(204)
                .then(() =>
                    db.from('wine').select('*').where('wine_id', testWine.wine_id).first()
                        .then(row => expect(row).to.be.undefined)
                )
        })

        it(`responds with 403 when user_id in the URL isn't the authenticated user`, () => {
            return supertest(app)
                .delete(`/wine/${otherUser.user_id}/${testWine.wine_id}`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(403)
        })

        it(`responds with 404 when the wine doesn't exist`, () => {
            return supertest(app)
                .delete(`/wine/${testUser.user_id}/999999`)
                .set('Authorization', helpers.makeAuthHeader(testUser))
                .expect(404)
        })
    })
})
