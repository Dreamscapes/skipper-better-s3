/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const stream = require('stream')
const crypto = require('crypto')
const local = require('local-scope')()


module.exports = class Hasher extends stream.Transform {
  constructor(opts) {
    super(opts)

    local(this).hasher = crypto.createHash('md5')
  }

  _transform(chunk, encoding, done) {
    local(this).hasher.update(chunk, encoding)

    return done(null, chunk)
  }

  md5(encoding) {
    return local(this).hasher.digest(encoding)
  }
}
