/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const map = new WeakMap()

module.exports = function local (key) {

  let contents = map.get(key)

  if (! contents)
    map.set(key, contents = {})

  return contents
}
