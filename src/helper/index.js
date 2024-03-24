import DeviceDetector from 'node-device-detector'
import ClientHints from 'node-device-detector/client-hints'

export const getDeviceData = (req) => {
  const detector = new DeviceDetector({ clientIndexes: true, deviceIndexes: true, deviceAliasCode: false })
  const clientHints = new ClientHints()
  const userAgent = req.headers?.['user-agent']
  const clientHintData = clientHints.parse(req.headers)
  return detector.detect(userAgent, clientHintData)
}
