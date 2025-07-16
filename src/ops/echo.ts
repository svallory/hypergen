import { ActionResult } from '../types.js'
import createResult from './result.js'

const notEmpty = (x: any) => x && x.length > 0
const echo = async (
  { attributes: { echo } },
  _args: unknown,
  { logger },
): Promise<ActionResult> => {
  const result = createResult('shell', echo)
  if (notEmpty(echo)) {
    logger.colorful(echo)
    return result('executed')
  }
  return result('ignored')
}

export default echo
