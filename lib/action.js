/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const AWS = require('aws-sdk')
const merge = require('semantic-merge')
const local = require('local-scope')()
const Uploader = require('./uploader')


module.exports = class Action {
  constructor(opts) {
    const scope = local(this)

    // Save configuration options and the S3 client to local scope
    scope.opts = opts
    scope.client = new AWS.S3(opts.service)
  }

  upload() {
    return new Uploader(local(this).opts)
  }

  download(fd, done) {
    const scope = local(this)
    const params = merge({ Key: fd }).and(scope.opts.request).into({})

    scope.client.getObject(params, (err, data) => err ? done(err, null) : done(null, data.Body))
  }

  stream(fd) {
    const scope = local(this)
    const params = merge({ Key: fd }).and(scope.opts.request).into({})
    const request = scope.client.getObject(params)
    const stream = request.createReadStream()

    // The request object may emit error events, but since we must return a stream, we should
    // somehow forward these errors to the caller
    request.on('error', err => stream.emit('error', err))

    return stream
  }

  remove(fd, done) {
    const scope = local(this)
    const params = merge({ Key: fd }).and(scope.opts.request).into({})

    scope.client.deleteObject(params, done)
  }

  list(dirname, done) {
    // If no dirname has been provided, list root
    dirname = dirname || ''

    const scope = local(this)
    const params = merge({ Prefix: dirname }).and(scope.opts.request).into({})
    const objects = []

    scope.client.listObjects(params).eachPage((err, data) => {
      if (err) {
        return done(err)
      }

      // Data will be null only when the last page has been already processed
      if (data) {
        for (const item of data.Contents) {
          objects.push(item.Key)
        }

        // Do not return the results just yet...
        return // eslint-disable-line consistent-return
      }

      // Okay, we now have the full listings - let's strip the dirname from the paths
      if (dirname) {
        for (const i of Object.keys(objects)) {
          objects[i] = objects[i].replace(`${dirname}/`, '')
        }
      }

      // Aaaand, finally we are done!
      return done(null, objects)
    })
  }

  url(operation, done) {
    const scope = local(this)
    const params = scope.opts.request

    // The S3 client seems to be very sensitive about its callback, even passing undefined will
    // trigger an error about it not being a function
    return done
      ? scope.client.getSignedUrl(operation, params, done)
      : scope.client.getSignedUrl(operation, params)
  }
}
