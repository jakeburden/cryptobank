var fs = require('fs')
var join = require('path').join
var sodium = require('sodium-native')

var payload = require('./cipher.json')
var cipher = Buffer.from(payload.cipher, 'hex')
var nonce = Buffer.from(payload.nonce, 'hex')

var secretKey = fs.readFileSync(join(__dirname, 'key.txt'))
var key = Buffer.from(secretKey, 'hex')

var plainText = Buffer.alloc(16)
sodium.crypto_secretbox_open_easy(plainText, cipher, nonce, key)

console.log(plainText)
