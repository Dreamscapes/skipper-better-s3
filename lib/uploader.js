/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const WritableStream = require('stream').Writable
    , path = require('path')
    , AWS = require('aws-sdk')
    , mime = require('mime')
    , merge = require('semantic-merge')
    , uuid = require('node-uuid')
    , local = require('local-scope')()
    , Hasher = require('./hasher')


module.exports = class Uploader extends WritableStream {

  constructor (opts) {

    // Initialise this writable stream in object mode
    super({ objectMode: true })

    const scope = local(this)

    // Save configuration options and the S3 client to local scope
    scope.opts = opts
    scope.client = new AWS.S3(opts.service)
  }

  _write (inStream, encoding, done) {

    const scope = local(this)
    // If there is a path property, this is an fs read stream
    // If there is no path, but fd, this is a standard http upload stream
    // If even the fd property is missing, fall back to a generated name
    // (Both path and fd could be missing if we upload i.e. a zlib or crypto stream and the
    // originator did not read the documentation about having to provide this property 😀)
        , name = inStream.path ? path.parse(inStream.path).base
                               : inStream.fd || uuid.v4()
        , parts = path.parse(name)

    // If we got a dirname in config options, and it is not already in the fd, add it
    // Skipper adds dirname for regular uploads, but for generic streams, we need to take care of
    // this ourselves
    if (scope.opts.dirname && parts.dir !== scope.opts.dirname)
      parts.dir = scope.opts.dirname

    const fd = path.format(parts)     // eslint-disable-line one-var
        , type = mime.lookup(name)
        , outStream = new Hasher()
        , params = merge({ Key: fd
                         , Body: outStream
                         , ContentType: type
                        })
                   .and(scope.opts.request)
                   .excluding('onProgress')
                   .into({})

        , request = scope.client.upload(params, scope.opts.options, (err, data) => {
          // If there has been an error with the upload, return immediately, otherwise the extra
          // object used below will be undefined and we will throw a completely unrelated error
          if (err)
            return done(err)

          // Attach the response data to the stream - Skipper packages this in its response to the
          // caller for further reuse
          inStream.extra = data
          // The ETag returned in the response is enclosed in double-quotes - I find this quite
          // irritating since I usually only care about the actual value - let's fix that once and
          // for all, for everyone!
          inStream.extra.ETag = inStream.extra.ETag.replace(/"/g, '')
          // Get the md5 hash we computed for this file stream and export it in the extras
          inStream.extra.md5 = outStream.md5('hex')
          // For non-http uploads, the fd and content-type are not available anywhere, so let's put
          // them to the extra as well, for convenience
          inStream.extra.fd = fd
          inStream.extra.ContentType = type

          return done(null, data)
        })

    // Fix the content type header on the request in case it was incorrectly detected
    // Wrong detection can happen when uploading via curl, for example.
    // Note that headers will only be provided for http uploads, not for fs read streams etc.
    if (inStream.headers instanceof Object)
      inStream.headers['content-type'] = type

    // Calculate md5 of the data being uploaded
    // We use this because the original assumption about the ETag being an md5 hash is only true
    // while doing single-part uploads of files smaller than 5GB. If it's larger or if the upload
    // is a multipart upload, the ETag is computed differently.
    inStream.pipe(outStream)

    // Attach progress handler, if provided
    if (typeof scope.opts.request.onProgress === 'function')
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
