const resolve = async (attributes) => {
  const ops = []
  if (attributes.to && !attributes.inject) {
    const add = (await import('./add.js')).default
    ops.push(add)
  }
  if (attributes.to && attributes.inject) {
    const inject = (await import('./inject.js')).default
    ops.push(inject)
  }
  if (attributes.echo) {
    const echo = (await import('./echo.js')).default
    ops.push(echo)
  }
  if (attributes.sh) {
    const shell = (await import('./shell.js')).default
    ops.push(shell)
  }
  if (attributes.setup) {
    const setup = (await import('./setup.js')).default
    ops.push(setup)
  }
  return ops
}
export default resolve
