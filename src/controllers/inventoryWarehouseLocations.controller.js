// ==================== Packages =======================
import { ObjectId } from 'mongodb'
import { getSelectParams } from '../helpers/generalHelper'

// ====================================================
import generalResponse from '../helpers/generalResponse.helper'
import {
  createWarehouseLocationRepo,
  updateWarehouseLocationRepo,
  deleteWarehouseLocationRepo,
  findWarehouseLocationRepo,
  findWarehouseLocationsRepo
} from '../repositories/inventoryWarehouseLocation.repository'

export const createWarehouseLocation = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) {
      return generalResponse(res, false, { text: 'Warehouse name is required.' }, 'error', false, 400)
    }

    const isExist = await findWarehouseLocationRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      type: req.body?.type,
      company: req?.headers?.authorization?.company
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Warehouse name already exists.' }, 'error')
    }
    const location = await createWarehouseLocationRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      company: req?.headers?.authorization?.company,
      ...req.body
    })

    return generalResponse(res, location, 'Warehouse Location created successfully.', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getWarehouseLocations = async (req, res) => {
  try {
    const locations = await findWarehouseLocationsRepo(
      { company: ObjectId(req?.headers?.authorization?.company) },
      getSelectParams(req)
    )
    return generalResponse(res, locations, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const checkLocationIsexist = async (req, res) => {
  try {
    const name = req.query?.name
    const type = JSON.parse(req.query?.type);
    const isExist = await findWarehouseLocationRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      type: type,
      company: req?.headers?.authorization?.company
    })
    if (isExist) {
      return generalResponse(res, true, { text: 'Location already exists.' }, 'error', false, 400)
    }
    return generalResponse(res, null)
  } catch (error) {
    console.log({ error })
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getLocation = async (req, res) => {
  try {
    const { id } = req.params
    if (!id) return generalResponse(res, null, { text: 'Id is required.' }, 'error')
    const location = await findWarehouseLocationRepo({ _id: id }, getSelectParams(req))
    return generalResponse(res, location, '', 'success')
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    if (!id) {
      return generalResponse(res, false, { text: 'Location id is required.' }, 'error', false, 400)
    }
    const isExist = await findWarehouseLocationRepo({
      nameId: name.replace(/ /g, '-').toLowerCase(),
      type: req.body.type,
      company: req?.headers?.authorization?.company,
    })

    if (isExist) {
      return generalResponse(res, null, { text: 'Location already exists.' }, 'error')
    }
    const location = await findWarehouseLocationRepo({ _id: id })
    if (!location) {
      return generalResponse(res, false, { text: 'Location not found.' }, 'error', false, 400)
    }
    const updateLocationDetails = {
    ...req.body,
      nameId: name.replace(/ /g, '-').toLowerCase()
    }
    await updateWarehouseLocationRepo({ _id: req.params.id }, updateLocationDetails)
    return generalResponse(res, null, 'Location updated successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteLocationById = async (req, res) => {
  try {
    const { id } = req.params

    const location = await findWarehouseLocationRepo({ _id: id, isDeleted: false })
    if (!location) {
      return generalResponse(res, false, { text: 'Location not found.' }, 'error', false, 400)
    }

    await deleteWarehouseLocationRepo({ _id: req.params.id })

    return generalResponse(res, null, 'Location deleted successfully!', 'success', true)
  } catch (error) {
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
