const wineService = {
    getWine(knex) {
        return knex
            .select('*')
            .from('wine');
    },

    insertWine(knex, newWine) {
        return knex
            .insert(newWine)
            .into('wine')
            .returning('*')
            .then(rows => rows[0]);
    },

    getById(knex, id) {
        return knex
            .from('wine')
            .select('*')
            .where('wine_id', id)
            .first();
    },

    deleteWine(knex, id) {
        return knex('wine')
            .where('wine_id', id)
            .delete();
    },

    updateWine(knex, id, newWine) {
        return knex('wine')
            .where('wine_id', id)
            .update(newWine);
    },

    getAllWine(knex, user_id) {
        return knex
            .select('*')
            .from('wine')
            .where('user_id', user_id)
    },
    searchWine(knex, searchTerm, user_id) {
        return knex
        .select('wine_id', 'user_id', 'wine_type', 'winemaker', 'wine_name', 'varietal', 'vintage', 'region', 'tasting_notes', 'rating', 'img_url')
        .from('wine')
        .where('user_id', '=', user_id)
        .where('wine_type', 'LIKE', `%${searchTerm.wine_type || ''}%`)
        .where('wine_name', 'LIKE', `%${searchTerm.wine_name || ''}%`)
        .where('winemaker', 'LIKE', `%${searchTerm.winemaker || ''}%`)
        .where('varietal', 'LIKE', `%${searchTerm.varietal || ''}%`)
        .where('region', 'LIKE', `%${searchTerm.region || ''}%`)
        .where('tasting_notes', 'LIKE', `%${searchTerm.tasting_notes || ''}%`)
        //.where('vintage', '=', `${searchTerm.vintage} || ''`)
        //.where('rating', '=', `${searchTerm.rating} || ''`)
    },
};

module.exports = wineService;