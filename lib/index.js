/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const Adapter = require('./adapter')


/**
 * Instantiate a new adapter
 *
 * Usually it is enough to call this function once per project.
 *
 * @param   {Object?}   globals     Optional global options for this adapter
 * @return  {Adapter}               New instance of the Adapter class
 */
module.exports = function getAdapter(globals) {
  // Due to an issue with current Skipper version, we must export a special wrapper around the
  // adapter instance. Once that issue is resolved, we can return a new Adapter instance directly
  // See the progress on Github:
  // https://github.com/balderdashy/skipper/pull/102
  const adapter = new Adapter(globals)
  const wrapper = {
    ls: (dirname, done) => adapter.ls(dirname, done),
    rm: (fd, done) => adapter.rm(fd, done),
    read: (fd, done) => adapter.read(fd, done),
    receive: opts => adapter.receive(opts),
    url: (operation, opts, done) => adapter.url(operation, opts, done),
  }

  return wrapper
}
