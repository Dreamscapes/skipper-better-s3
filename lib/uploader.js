/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const WritableStream = require('stream').Writable
    , AWS = require('aws-sdk')
    , mime = require('mime')
    , merge = require('semantic-merge')
    , uuid = require('node-uuid')
    , local = require('./util/local')


module.exports = class Uploader extends WritableStream {

  constructor (opts) {

    // Initialise this writable stream in object mode
    super({ objectMode: true })

    const scope = local(this)

    // Save configuration options and the S3 client to local scope
    scope.opts = opts
    scope.client = new AWS.S3(opts.service)
  }

  _write (stream, encoding, done) {

    // Fix the content type header on the request in case it was incorrectly detected
    // Wrong detection can happen when uploading via curl, for example.
    // This will also help the S3 library to properly detect and set the Content-Type in storage.
    stream.headers['content-type'] = mime.lookup(stream.fd)

    const scope = local(this)
        , params = merge({ Key: stream.fd
                         , Body: stream
                         , ContentType: stream.headers['content-type']
                        })
                   .and(scope.opts.request)
                   .excluding('onProgress')
                   .into({})
        , request = scope.client.upload(params, (err, data) => {
          // Attach the response data to the stream - Skipper packages this in its response to the
          // caller for further reuse
          stream.extra = data
          // The ETag returned in the response is enclosed in double-quotes - I find this quite
          // irritating since I usually only care about the actual value - let's fix that once and
          // for all, for everyone!
          stream.extra.ETag = stream.extra.ETag.replace(/"/g, '')

          return done(err, data)
        })

    // Attach progress handler
    this.trackProgress(request, scope.opts.request.onProgress)
  }

  trackProgress (request, handler) {

    // If there's no handler provided, do not attach any listeners
    if (typeof handler !== 'function')
      return

    // Generate a per-request unique ID
    const id = uuid.v4()

    request.on('httpUploadProgress', progress => {
      // Prepare Skipper-specific progress structure
      const written = progress.loaded
      // S3 docs say that progress.total may not always be present, so let's have some fallback
          , total = progress.total || request.body.byteCount || null
          , data =
            { id: id
            , fd: request.body.fd
            , name: request.body.name
            , written: written
            , total: total
            // If total is null, performing bitwise-or will change the result to 0
            // It also rounds down to an integer, which is kinda nice
            , percent: written / total * 100 | 0
            }

      handler(data)
    })
  }
}
