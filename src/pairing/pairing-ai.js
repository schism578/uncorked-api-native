const express = require('express')
const Anthropic = require('@anthropic-ai/sdk')
const wineService = require('../wine/wine-service')
const { requireAuth } = require('../middleware/jwt-auth')
const config = require('../config')
const pairingAiRouter = express.Router()

const VALID_FOOD_TYPES = ['cheese', 'charcuterie', 'dish']

function buildPrompt(wine) {
  return `A user recorded this wine tasting memory:
- Type: ${wine.wine_type}
- Varietal: ${wine.varietal || 'unknown'}
- Region: ${wine.region || 'unknown'}
- Tasting notes: ${wine.tasting_notes || 'none recorded'}
- Their rating: ${wine.rating || 'unrated'} out of 5

Suggest 3 to 5 food pairings for this wine, mixing cheese, charcuterie, and full dish suggestions where sensible. Respond with ONLY a JSON array (no prose, no markdown fences), where each item has this exact shape:
{"food_type": "cheese" | "charcuterie" | "dish", "name": string, "reason": string, "recipe": {"ingredients": string[], "steps": string[]} (optional, only for "dish")}`
}

function stripMarkdownFences(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return fenced ? fenced[1] : text
}

function parseSuggestions(text) {
  let parsed
  try {
    parsed = JSON.parse(stripMarkdownFences(text.trim()))
  } catch (err) {
    throw new Error('Model did not return valid JSON')
  }
  if (!Array.isArray(parsed)) {
    throw new Error('Model response was not an array')
  }
  return parsed
    .filter(item => item && VALID_FOOD_TYPES.includes(item.food_type) && item.name)
    .map(item => {
      const hasValidRecipe = item.recipe
        && Array.isArray(item.recipe.ingredients)
        && Array.isArray(item.recipe.steps)
      return {
        food_type: item.food_type,
        name: item.name,
        reason: item.reason || '',
        recipe: hasValidRecipe ? { ingredients: item.recipe.ingredients, steps: item.recipe.steps } : undefined,
      }
    })
}

pairingAiRouter
  .route('/:wine_id/suggest')
  .all(requireAuth)
  .post((req, res, next) => {
    const knexInstance = req.app.get('db');
    wineService.getById(knexInstance, req.params.wine_id)
      .then(wine => {
        if (!wine) {
          return res.status(404).json({ error: { message: 'Wine not found' } })
        }
        if (wine.user_id !== req.user.user_id) {
          return res.status(403).json({ error: { message: 'Forbidden' } })
        }

        const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
        return client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 1536,
          messages: [{ role: 'user', content: buildPrompt(wine) }],
        })
          .then(message => {
            console.log('pairing-suggest usage:', message.usage)
            const textBlock = message.content.find(block => block.type === 'text')
            const suggestions = parseSuggestions(textBlock ? textBlock.text : '')
            res.json(suggestions)
          })
      })
      .catch(err => {
        if (err.message === 'Model did not return valid JSON' || err.message === 'Model response was not an array') {
          return res.status(502).json({ error: { message: 'Failed to generate pairing suggestions' } })
        }
        next(err)
      })
  })

module.exports = pairingAiRouter
