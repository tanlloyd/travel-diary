import { Router } from 'express'

const healthRouter = Router()

healthRouter.get('/health', (request, response) => {
  response.status(200).json({ status: 'ok' })
})

export default healthRouter
