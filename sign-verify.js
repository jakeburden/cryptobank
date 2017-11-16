var assert = require('assert')
var sodium = require('sodium-native')
var message = Buffer.from('verify this message please')

var publicKey = Buffer.alloc(sodium.crypto_sign_PUBLICKEYBYTES)
var secretKey = Buffer.alloc(sodium.crypto_sign_SECRETKEYBYTES)

sodium.crypto_sign_keypair(publicKey, secretKey)

var signature = Buffer.alloc(sodium.crypto_sign_BYTES)

sodium.crypto_sign_detached(signature, message, secretKey)

assert(
  sodium.crypto_sign_verify_detached(signature, message, publicKey),
  'message verification unsuccessful' // error if message has been tampered with
)
