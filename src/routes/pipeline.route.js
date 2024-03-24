import { Router } from 'express'
import {
  createNewPipeline,
  deletePipelineDetails,
  getPipeline,
  getPipelineStages,
  updateMemberPipeline,
  updatePipelineDetails
} from '../controllers/pipeline.controller'
import { authenticated } from '../middlewares/authenticated.middleware'

const pipeline = Router()

// GET
pipeline.get('/pipeline', authenticated, getPipeline)
pipeline.get('/pipeline/stages', authenticated, getPipelineStages)

// POST
pipeline.post('/pipeline', authenticated, createNewPipeline)

// PUT
pipeline.put('/update-stage/:id', authenticated, updateMemberPipeline)
pipeline.put('/pipeline/:id', authenticated, updatePipelineDetails)

// DELETE
pipeline.delete('/pipeline/:id', authenticated, deletePipelineDetails)

export default pipeline
