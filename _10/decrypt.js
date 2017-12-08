var fs = require('fs')
var join = require('path').join
var sodium = require('sodium-native')


fs.readFile(join(__dirname, 'key.txt'), function (err, secretKey) {
  var payload = require('./cipher.json')
  var cipher = Buffer.from(payload.cipher, 'hex')
  var nonce = Buffer.from(payload.nonce, 'hex')

  var plainText = Buffer.alloc(cipher.length - sodium.crypto_secretbox_MACBYTES)
  sodium.crypto_secretbox_open_easy(plainText, cipher, nonce, secretKey)

  console.log(plainText.toString())
})
