const express = require('express')
const pairingService = require('./pairing-service')
const { requireAuth } = require('../middleware/jwt-auth')
const pairingRouter = express.Router()
const jsonParser = express.json({ limit: '8mb' })

const serializePairing = pairing => ({
  pairing_id: pairing.pairing_id,
  wine_id: pairing.wine_id,
  user_id: pairing.user_id,
  food_type: pairing.food_type,
  name: pairing.name,
  notes: pairing.notes,
  img_url: pairing.img_url,
  source: pairing.source,
})

function requireOwnUser(req, res, next) {
  if (Number(req.params.user_id) !== req.user.user_id) {
    return res.status(403).json({ error: { message: 'Forbidden' } })
  }
  next()
}

pairingRouter
  .route('/:user_id')
  .all(requireAuth, requireOwnUser)
  .get((req, res, next) => {
    const knexInstance = req.app.get('db');
    pairingService.getPairingsForUser(knexInstance, req.params.user_id, req.query.wine_id)
      .then(pairings => {
        res.json(pairings.map(serializePairing))
      })
      .catch(next)
  })
  .post(jsonParser, (req, res, next) => {
    const { wine_id, food_type, name, notes, img_url, source } = req.body
    const newPairing = { wine_id, food_type, name }

    for (const [key, value] of Object.entries(newPairing))
      if (value == null)
        return res.status(400).json({
          error: { message: `missing '${key}' in request body` }
        })

    newPairing.notes = notes
    newPairing.img_url = img_url
    newPairing.source = source || 'user_added'
    newPairing.user_id = req.user.user_id;

    pairingService.insertPairing(
      req.app.get('db'),
      newPairing
    )
      .then(pairing => {
        res
          .status(201)
          .json(serializePairing(pairing))
      })
      .catch(next)
  })

pairingRouter
  .route('/:user_id/:pairing_id')
  .all(requireAuth, requireOwnUser)
  .patch(jsonParser, (req, res, next) => {
    const knexInstance = req.app.get('db');
    const { food_type, name, notes, img_url } = req.body
    const updateFields = { food_type, name, notes, img_url }
    Object.keys(updateFields).forEach(key => updateFields[key] === undefined && delete updateFields[key])

    pairingService.getById(knexInstance, req.params.pairing_id)
      .then(pairing => {
        if (!pairing || pairing.user_id !== req.user.user_id) {
          return res.status(404).json({ error: { message: 'Pairing not found' } })
        }
        return pairingService.updatePairing(knexInstance, req.params.pairing_id, updateFields)
          .then(() => pairingService.getById(knexInstance, req.params.pairing_id))
          .then(updatedPairing => res.json(serializePairing(updatedPairing)))
      })
      .catch(next)
  })
  .delete((req, res, next) => {
    const knexInstance = req.app.get('db');
    pairingService.getById(knexInstance, req.params.pairing_id)
      .then(pairing => {
        if (!pairing || pairing.user_id !== req.user.user_id) {
          return res.status(404).json({ error: { message: 'Pairing not found' } })
        }
        return pairingService.deletePairing(knexInstance, req.params.pairing_id)
          .then(() => res.status(204).end())
      })
      .catch(next)
  })

module.exports = pairingRouter
