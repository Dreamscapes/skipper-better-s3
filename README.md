# [<img title="skipper-gridfs - GridFS filesystem adapter for Skipper" src="http://i.imgur.com/P6gptnI.png" width="200px" alt="skipper emblem - face of a ship's captain"/>][project-root] Skipper-Better-S3

[![NPM Version][npm-badge]][npm-url]
![Runs on Node][node-badge]
![Built with GNU Make][make-badge]
![Uses ECMAScript 2015][es-badge]

> A better, modern implementation of Skipper's S3 file adapter

**This adapter uses ECMAScript 2015 (ES 6) syntax**: you must run at least Node.js v4 in order to use this adapter.

## Why better?

Have you ever tried to upload a file and make it publicly readable using the official skipper-s3 adapter? Well you cannot do that, there's just no support for such things. What was even worse, the official adapter kept calculating incorrect md5 hashes of the uploaded files which lead to all kinds of errors when I started verifying the uploaded files' integrity.

Also, the official adapter's codebase seems to be really complicated, at least to me :smile:, which in long term might discourage potential contributions.

## Installation

`$ npm install skipper-better-s3 --save`

Also make sure you have Skipper [installed as your body parser](http://sailsjs.org/documentation/concepts/middleware#adding-or-overriding-http-middleware).

> Skipper is installed by default in [Sails](https://github.com/balderdashy/sails) v0.10 and above.

## Usage

### File uploads

You upload the files as usual with any other adapter. See some examples below.

#### Supported options

| Option     | Type     | Details                                                                                                                                                                                                     |
|------------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| key        | String   | Your Amazon access key                                                                                                                                                                                      |
| secret     | String   | Your Amazon secret                                                                                                                                                                                          |
| bucket     | String   | The S3 bucket to upload the file to                                                                                                                                                                         |
| s3params   | Object   | Optional parameters to be passed to the underlying Amazon SDK library when performing the file upload. This could be any parameter that is supported by the S3's [`upload()`][s3-upload] method.            |
| s3options  | Object   | Optional configuration for the upload request to be passed to the underlying Amazon SDK library. This could be any parameter that is supported by the second argument of the [`upload()`][s3-upload] method. |
| onProgress | Function | Marked by Skipper core as experimental. If provided, will be called periodically as the data is being uploaded with current progress information.                                                           |

#### Example usage

```js
const options =
      { // This is the usual stuff
        adapter: require('skipper-better-s3')
      , key: 'somekeyhere'
      , secret: 'dontsharethis'
      , bucket: 'my-s3-bucket'
        // Let's use the custom s3params to upload this file as publicly
        // readable by anyone
      , s3params:
        { ACL: 'public-read'
        }
        // And while we are at it, let's monitor the progress of this upload
      , onProgress: progress => sails.log.verbose('Upload progress:', progress)
      }

req.file('avatar').upload(options, (err, files) => {
  // ... Continue as usual
})
```

### File downloads

To download a previously uploaded file, you must first get an actual adapter object to use it and
provide some basic configuration, like your S3 credentials and the bucket to read from.

You can either get a readable stream that you can consume or pipe to the client directly (efficient,
does not require buffering the whole file to memory), or you can provide a callback which will then
receive the full contents of the file being downloaded.

#### Example usage

```js
const options =
      { key: 'somekeyhere'
      , secret: 'dontsharethis'
      , bucket: 'my-s3-bucket'
      }
      // This will give you an adapter instance configured with the
      // credentials and bucket defined above
    , adapter = require('skipper-better-s3')(options)

// Now the adapter is ready to interface with your S3 bucket.
// Let's assume you have a file named 'avatar.jpg' stored
// in the root of this bucket...

// Option 1: get a readable stream of the file
const readableStream = adapter.read('avatar.jpg')
// Option 2: get the full file contents in a callback
adapter.read('avatar.jpg', (err, data) => {
  // data is now a Buffer containing the avatar
})
```

### Directory listing

You can get a list of files at a given path in a bucket.

#### Example usage

```js
const options =
      { key: 'somekeyhere'
      , secret: 'dontsharethis'
      , bucket: 'my-s3-bucket'
      }
      // This will give you an adapter instance configured with the
      // credentials and bucket defined above
    , adapter = require('skipper-better-s3')(options)

// Assuming there is a directory named 'avatars' in your bucket root...
adapter.ls('avatars', (err, files) => {
  // files is now an array of paths, relative to the given directory name
})
```

### Deleting objects

Simply call `adapter.rm(fd, done)` on a configured adapter instance (see previous examples on how to get such instance). `fd` should be the path to the object to be deleted, relative to the bucket.

#### Example usage

```js
// Assuming you already have an adapter instance...
adapter.rm('avatars/123.jpg', (err, res) => {
  // res is whatever S3 SDK returns (honestly no idea what's inside, have a look)
})
```

## Extras

This adapter comes with some extra functionality not defined in the Skipper adapter specifications.

### Generating signed URLs for S3

Signed URLs are a great way of allowing others to interact with your S3 storage directly. For example, you can generate a file download link that will be valid only for 5 minutes, or a link which will allow someone to upload a file into a predetermined location in your S3 bucket.

This is great, because it allows your clients to interact with your S3 storage directly, instead of bothering your server with all the network traffic and computational power necessary to upload/download files.

#### Example usage

```js
// Assuming you already have an adapter instance...
const url = adapter.url('getObject', { s3params: { Key: 'avatars/123.jpg' } })
// Give the url to the client - they can read this file directly from there
// Optionally do a redirect (303 - "see other") to this file yourself:
// res.redirect(303, url)
```

## Documentation

Full API documentation with detailed description of all methods is available offline. Clone this repo and do the following within the cloned folder:

```bash
$ npm install
$ make docs
$ open docs/index.html # If open does not work, just double-click this file
```

## License

This software is licensed under the **BSD-3-Clause License**. See the [LICENSE](LICENSE) file for more information.


[npm-badge]: https://img.shields.io/npm/v/skipper-better-s3.svg?style=flat-square
[node-badge]: https://img.shields.io/node/v/skipper-better-s3.svg?style=flat-square
[make-badge]: https://img.shields.io/badge/built%20with-GNU%20Make-brightgreen.svg?style=flat-square
[es-badge]: https://img.shields.io/badge/ECMA-2015-f0db4f.svg?style=flat-square
[npm-url]: https://npmjs.org/package/skipper-better-s3
[skipper-logo]: http://i.imgur.com/P6gptnI.png
[project-root]: https://github.com/Dreamscapes/skipper-better-s3
[s3-upload]: http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#upload-property
