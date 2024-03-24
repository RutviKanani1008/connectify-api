import generalResponse from '../helpers/generalResponse.helper'
import { deleteAttachmentFromWasabi } from '../middlewares/fileUploader'
import { aggregatePages } from '../repositories/pages.repository'
import {
  createUserGuide,
  deleteUserGuide,
  findAllUserGuide,
  findUserGuide,
  updateUserGuide
} from '../repositories/userGuide.repository'
import _ from 'lodash'

export const getAvailablePages = async (req, res) => {
  try {
    const pages = await aggregatePages()
    // if (pages.length) {
    //   pages = pages.map((page) => {
    //     if (page.children.length) {
    //       let childrenId = []
    //       page.children.forEach((subChild) => {
    //         if (subChild.children.length) {
    //           console.log({ subChild: subChild.children })
    //           childrenId = [...childrenId, ...subChild.children.map((childId) => String(childId?._id))]
    //         }
    //       })
    //       console.log({ childrenId })
    //       if (childrenId.length) {
    //         page.children = page.children
    //           .map((child) => {
    //             if (!childrenId.includes(String(child?._id))) {
    //               return child
    //             }
    //           })
    //           ?.filter((child) => child)
    //       }
    //     }
    //     return page
    //   })
    //   // console.log({ pages })
    // }
    return generalResponse(res, pages, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const addUserGuideDetail = async (req, res) => {
  try {
    const userGuide = await createUserGuide(req.body)
    const userGuideDetails = await findUserGuide({ _id: userGuide?._id }, [{ path: 'page', ref: 'Pages' }])

    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }
    return generalResponse(res, userGuideDetails, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateUserGuideDetails = async (req, res) => {
  try {
    await updateUserGuide({ _id: req.params.id }, req.body)
    const userGuide = await findUserGuide({ _id: req.params.id }, [
      { path: 'page', ref: 'Pages', select: { pageName: 1 } }
    ])

    const { removeAttachments = [] } = req.body
    if (_.isArray(removeAttachments) && removeAttachments.length > 0) {
      await deleteAttachmentFromWasabi(removeAttachments)
    }

    return generalResponse(res, userGuide, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getUserGuideDetails = async (req, res) => {
  try {
    const userGuides = await findAllUserGuide({}, [{ path: 'page', ref: 'Pages' }])
    return generalResponse(res, userGuides, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteUserGuideDetail = async (req, res) => {
  try {
    await deleteUserGuide({ _id: req.params?.id })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
