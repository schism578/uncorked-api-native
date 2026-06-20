const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

function makeUsersArray() {
  return [
    {
      user_id: 1,
      username: 'test username',
      password: 'password',
    },
    {
      user_id: 2,
      username: 'test username',
      password: 'password',
    },
    {
      user_id: 3,
      username: 'test username',
      password: 'password',
    },
    {
      user_id: 4,
      username: 'test username',
      password: 'password',
    },
  ]
}

function makeWineArray() {
  return [
    {
      user_id: 1,
      winemaker: 'winemaker_1',
      wine_type: 'wine_type_1',
      wine_name: 'wine_name_1',
      varietal: 'varietal_1',
      vintage: 2020,
      region: 'region_1',
      tasting_notes: 'tasting_notes_1',
      rating: 1,
      img_url: 'img_url_1',
      wine_id: 1,
    },
    {
      user_id: 2,
      winemaker: 'winemaker_2',
      wine_type: 'wine_type_2',
      wine_name: 'wine_name_2',
      varietal: 'varietal_2',
      vintage: 2020,
      region: 'region_2',
      tasting_notes: 'tasting_notes_2',
      rating: 2,
      img_url: 'img_url_2',
      wine_id: 2,
    },
    {
      user_id: 3,
      winemaker: 'winemaker_3',
      wine_type: 'wine_type_3',
      wine_name: 'wine_name_3',
      varietal: 'varietal_3',
      vintage: 2020,
      region: 'region_3',
      tasting_notes: 'tasting_notes_3',
      rating: 3,
      img_url: 'img_url_3',
      wine_id: 3,
    },
    {
      user_id: 4,
      winemaker: 'winemaker_4',
      wine_type: 'wine_type_4',
      wine_name: 'wine_name_4',
      varietal: 'varietal_4',
      vintage: 2020,
      region: 'region_4',
      tasting_notes: 'tasting_notes_4',
      rating: 4,
      img_url: 'img_url_4',
      wine_id: 4,
    }
  ]
}

function makePairingArray() {
  return [
    {
      pairing_id: 1,
      wine_id: 1,
      user_id: 1,
      food_type: 'cheese',
      name: 'pairing_name_1',
      notes: 'pairing_notes_1',
      img_url: 'pairing_img_1',
      source: 'user_added',
    },
    {
      pairing_id: 2,
      wine_id: 1,
      user_id: 1,
      food_type: 'charcuterie',
      name: 'pairing_name_2',
      notes: 'pairing_notes_2',
      img_url: 'pairing_img_2',
      source: 'ai_suggested',
    },
  ]
}

function makeUsersFixtures() {
  const testUsers = makeUsersArray();
  return { testUsers }
}

function makeWineFixtures() {
  const testWines = makeWineArray();
  return { testWines }
}

function makePairingFixtures() {
  const testPairings = makePairingArray();
  return { testPairings }
}

function cleanTables(db) {
  return db.transaction(trx =>
    trx.raw(
      `TRUNCATE
          food_pairing,
          wine,
          user_info
        CASCADE`
    )
      .then(() =>
        Promise.all([
          trx.raw(`ALTER SEQUENCE user_info_user_id_seq minvalue 0 START WITH 1`),
          trx.raw(`SELECT setval('user_info_user_id_seq', 0)`),
        ])
      )
  )
}

function seedUsers(db, users) {
  const preppedUsers = users.map(user => ({
    ...user,
    password: bcrypt.hashSync(user.password, 1)
  }))
  return db.into('user_info').insert(preppedUsers)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(
        `SELECT setval('user_info_user_id_seq', ?)`,
        [users[users.length - 1].user_id],
      )
    )
}

function seedWines(db, wine) {
  const preppedWines = wine.map(wine => ({
    ...wine
  }))
  return db.into('wine').insert(preppedWines)
    .then(() =>
      // update the auto sequence to stay in sync
      db.raw(
        `SELECT setval('wine_user_id_seq', ?)`,
        [wine[wine.length - 1].user_id],
      )
    )
}

function seedPairings(db, pairings) {
  return db.into('food_pairing').insert(pairings)
    .then(() =>
      db.raw(
        `SELECT setval('food_pairing_pairing_id_seq', ?)`,
        [pairings[pairings.length - 1].pairing_id],
      )
    )
}

function makeAuthHeader(user, secret = process.env.JWT_SECRET) {
  const token = jwt.sign({ user_id: user.user_id }, secret, {
    subject: user.username,
    algorithm: 'HS256',
  })
  return `Bearer ${token}`
}

module.exports = {
  makeUsersArray,
  makeWineArray,
  makePairingArray,
  makeUsersFixtures,
  makeWineFixtures,
  makePairingFixtures,
  cleanTables,
  seedUsers,
  seedWines,
  seedPairings,
  makeAuthHeader
}