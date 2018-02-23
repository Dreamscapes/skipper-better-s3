/**
 * skipper-better-s3
 *
 * @author     Robert Rossmann <rr.rossmann@me.com>
 * @copyright  2015 Robert Rossmann
 * @license    http://choosealicense.com/licenses/bsd-3-clause  BSD-3-Clause License
 */

'use strict'

const merge = require('semantic-merge')
const local = require('local-scope')()
const Action = require('./action')


module.exports = class Adapter {
  /**
   * Parse user-provided options into our own internal structure expected by the service
   *
   * @method  Adapter.parseOptions
   * @static
   *
   * @param   {Object}    opts        Options object to be parsed
   * @param   {Object?}   defaults    Default configuration to be used for missing properties
   * @return  {Object}                The parsed object
   */
  static parseOptions(opts, defaults) {
    // Normalise the hell out of it...
    opts = opts || {}
    defaults = defaults || {}
    defaults.service = defaults.service || {}
    defaults.request = defaults.request || {}

    const config = {
      service: {
        accessKeyId: opts.key || defaults.service.accessKeyId,
        secretAccessKey: opts.secret || defaults.service.secretAccessKey,
        apiVersion: '2006-03-01',
        region: opts.region || defaults.service.region,
      },

      request: {
        Bucket: opts.bucket || defaults.request.Bucket,
      },

      options: opts.s3options || {},
      // This should only be used when uploading a non-http stream - dirname is usually used
      // by Skipper directly and we receive the full path from it when we receive the stream
      dirname: opts.dirname || null,
    }

    config.request = merge(config.request)
      .and(opts.s3params || {})
      .excluding('s3options')
      .into({})

    config.service = merge(config.service)
      .and(opts.s3config || {})
      .into({})

    return config
  }


  /**
   * Create a new Adapter instance
   *
   * @classdesc           The Adapter implements the standard interface that Skipper expects from
   *                      each adapter implementation.
   *
   * @constructor   Adapter
   *
   * @param   {Object?}   globals         Global options to be used for all subsequent requests
   * @param   {String?}   globals.key     S3 access key
   * @param   {String?}   globals.secret  S3 access secret
   * @param   {String?}   globals.bucket  S3 bucket to use for all requests
   * @return  {Adapter}
   */
  constructor(globals) {
    local(this).globals = Adapter.parseOptions(globals)
  }

  /**
   * Callback for the `ls()` method
   *
   * @callback  lsDone
   * @memberof  Adapter
   *
   * @param   {Error?}      err     Optional error
   * @param   {String[]?}   data    An array of string paths
   */

  /**
   * Get the contents at given path
   *
   * @method  Adapter#ls
   *
   * @param   {String}          dirname   The path where to perform the listing
   * @param   {Adapter.lsDone}  done      Callback function
   * @return {void}
   */
  ls(dirname, done) {
    return new Action(local(this).globals).list(dirname, done)
  }

  /**
   * Callback for the `rm()` method
   *
   * @callback  rmDone
   * @memberof  Adapter
   *
   * @param     {Error?}    err     Optional error
   * @param     {Object?}   data    Additional data about the request, as returned by S3.
   * @see       http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property
   */

  /**
   * Remove an item at given path
   *
   * @method  Adapter#rm
   *
   * @param   {String}          fd    The item to be removed
   * @param   {Adapter.rmDone}  done  Callback function
   * @return  {void}
   */
  rm(fd, done) {
    return new Action(local(this).globals).remove(fd, done)
  }

  /**
   * Callback for the `read()` method
   *
   * @callback  readDone
   * @memberof  Adapter
   *
   * @param     {Error?}    err     Optional error
   * @param     {Buffer?}   body    The item's contents, as buffer
   * @see       http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getObject-property
   */

  /**
   * Read an item at given path
   *
   * @method  Adapter#read
   *
   * @param   {String}              fd      The item to be read
   * @param   {Adapter.readDone?}   done    Optional callback. If provided, the item's contents will
   *                                        be passed to it. If omitted, a stream will be returned
   *                                        instead which you can consume.
   * @return {ReadableStream|void}
   */
  read(fd, done) {
    const action = new Action(local(this).globals)

    return done
      ? action.download(fd, done)
      : action.stream(fd)
  }

  /**
   * Callback for the `url()` method
   *
   * @callback  urlDone
   * @memberof  Adapter
   *
   * @param     {Error?}    err     Optional error
   * @param     {String?}   url     The signed URL
   * @see       http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
   */

  /**
   * Generate a signed URL for the given S3 operation
   *
   * @method  Adapter#url
   *
   * @param   {String}            operation         A valid S3 operation identifier
   * @param   {Object?}           opts              Optional additional configuration
   * @param   {String?}           opts.key          S3 access key
   * @param   {String?}           opts.secret       S3 access secret
   * @param   {String?}           opts.bucket       S3 bucket to use for this operation
   * @param   {Object?}           opts.s3params     Optional object to provide additional options
   *                                                for the signed request. The options can be
   *                                                anything that is supported by the given S3's
   *                                                operation.
   * @param   {Adapter.urlDone?}  done              Optional callback. If omitted, you must already
   *                                                have valid credentials saved in this service.
   * @return  {String|void}                         If called synchronously, will return the signed
   *                                                URL for the specified operation.
   * @see     http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
   */
  url(operation, opts, done) {
    opts = Adapter.parseOptions(opts, local(this).globals)

    return new Action(opts).url(operation, done)
  }

  /**
   * Upload progress handler
   *
   * This function, if provided, will be called periodically with status information about the
   * ongoing upload request.
   *
   * @callback  onProgress
   * @memberof  Adapter
   *
   * @param     {Object}    data            Object with current progress information
   * @param     {String}    data.id         Unique ID for the current upload request
   * @param     {String}    data.fd         Path to the file being written
   * @param     {String}    data.name       Name of the file being written
   * @param     {Integer}   data.written    Number of bytes written so far
   * @param     {Integer?}  data.total      If known, total number of bytes to be written
   * @param     {Integer}   data.percent    Percentage progress. If the total amount of bytes to be
   *                                        written is unknown, this will be 0.
   */

  /**
   * Upload a stream of files
   *
   * @method  Adapter#receive
   *
   * @param   {Object?}               opts              Optional additional configuration
   * @param   {String?}               opts.key          S3 access key
   * @param   {String?}               opts.secret       S3 access secret
   * @param   {String?}               opts.bucket       S3 bucket to upload to
   * @param   {Adapter.onProgress?}   opts.onProgress   Function to be called repeatedly as the
   *                                                    upload progresses
   * @param   {Object?}               opts.s3params     Optional object to provide additional
   *                                                    options for the upload request. The options
   *                                                    can be anything that is supported by S3's
   *                                                    `upload()` method.
   * @param   {Object?}               opts.s3options    Optional object to further configure the
   *                                                    upload request. This is passed directly to
   *                                                    the S3's `upload()` method as second
   *                                                    parameter.
   *
   * @see     http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
   * @return  {Uploader}
   */
  receive(opts) {
    // Normalise...
    opts = opts || {}

    opts = merge(Adapter.parseOptions(opts, local(this).globals))
      // Allow the special onProgress event listener to be passed to the upload request
      .and({ request: { onProgress: opts.onProgress } })
      .recursively.into({})

    return new Action(opts).upload()
  }
}
