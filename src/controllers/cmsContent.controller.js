import generalResponse from '../helpers/generalResponse.helper'
import {
  createCmsContent,
  deleteCmsContent,
  findAllCmsContent,
  findCmsContent,
  updateCmsContent
} from '../repositories/cmsContent.repository'

export const addCmsContentDetail = async (req, res) => {
  try {
    const cmsContent = await createCmsContent(req.body)
    const cmsContentDetail = await findCmsContent({ _id: cmsContent?._id }, [{ path: 'page', ref: 'Pages' }])

    return generalResponse(res, cmsContentDetail, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const updateCmsContentDetails = async (req, res) => {
  try {
    await updateCmsContent({ _id: req.params.id }, req.body)
    const cmsContent = await findCmsContent({ _id: req.params.id }, [
      { path: 'page', ref: 'Pages', select: { pageName: 1, pageId: 1 } }
    ])

    return generalResponse(res, cmsContent, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const getCmsContents = async (req, res) => {
  try {
    const cmsContents = await findAllCmsContent({}, [{ path: 'page', ref: 'Pages' }])
    return generalResponse(res, cmsContents, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}

export const deleteCmsContentDetail = async (req, res) => {
  try {
    await deleteCmsContent({ _id: req.params?.id })
    return generalResponse(res, null, 'success')
  } catch (error) {
    console.log(error)
    return generalResponse(res, error, '', 'error', false, 400)
  }
}
