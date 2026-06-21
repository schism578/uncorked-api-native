const pairingService = {
    insertPairing(knex, newPairing) {
        return knex
            .insert(newPairing)
            .into('food_pairing')
            .returning('*')
            .then(rows => rows[0]);
    },

    getById(knex, id) {
        return knex
            .from('food_pairing')
            .select('*')
            .where('pairing_id', id)
            .first();
    },

    getPairingsForUser(knex, user_id, wine_id) {
        const query = knex
            .select('*')
            .from('food_pairing')
            .where('user_id', user_id);

        if (wine_id) {
            query.where('wine_id', wine_id);
        }

        return query;
    },

    deletePairing(knex, id) {
        return knex('food_pairing')
            .where('pairing_id', id)
            .delete();
    },

    updatePairing(knex, id, newPairingFields) {
        return knex('food_pairing')
            .where('pairing_id', id)
            .update(newPairingFields);
    },
};

module.exports = pairingService;
