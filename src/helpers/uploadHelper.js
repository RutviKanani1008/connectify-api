import fs from 'fs'
import path from 'path'

export const upload = async (file, directoryName) => {
  const __dirname = path.resolve()

  const fileName = file.name || file.originalname
  const nameArray = fileName.split('.')
  const extension = nameArray[nameArray.length - 1]
  const name = Date.now() + '_' + nameArray[0] + '.' + extension

  const directoryPath = path.join(__dirname, '/public/uploads/' + directoryName)
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath)
  }

  const uploadPath = directoryPath + '/' + name

  const res = await file.mv(uploadPath)
  if (res) {
    return false
  }
  return path.join('uploads', directoryName, '/', name)
}
