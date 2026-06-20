require('dotenv').config()
const express = require('express')
const morgan = require('morgan')
const cors = require('cors')
const helmet = require('helmet')
const { NODE_ENV } = require('./config')
const userRouter = require('./user/user-router')
const wineRouter = require('./wine/wine-router')
const authRouter = require('./auth/auth-router')
const pairingRouter = require('./pairing/pairing-router')
const pairingAiRouter = require('./pairing/pairing-ai')

const app = express()

const morganSetting = (process.env.NODE_ENV === 'production')
  ? 'tiny'
  : 'common';

app.use(morgan(morganSetting))
app.use(helmet())
app.use(cors())

app.get('/', (req, res) => {
    res.send('Hello, world!')
})

app.use('/auth', authRouter)
app.use('/user', userRouter)
app.use('/wine', wineRouter)
app.use('/pairing', pairingAiRouter)
app.use('/pairing', pairingRouter)

app.use(function errorHandler(error, req, res, next) {
        let response
        if (NODE_ENV === 'production') {
            response = { error: { message: 'server error' } }
        } else {
            console.error(error)
            response = { message: error.message, error }
        }
        res.status(500).json(response)
    })

module.exports = app