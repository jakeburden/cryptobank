// require libsodium
var sodium = require('sodium-native')

// allocate an empty buffer (32 bytes in my case)
var output = Buffer.alloc(sodium.crypto_generichash_BYTES)

// create a buffer from the string "Hello, World!"
var buf = Buffer.from('Hello, World!')

// allocate another empty buffer
var key = Buffer.alloc(sodium.crypto_generichash_BYTES)
// wrtie some data to it, this will be namespace for the BLAKE2b hash
key.write('my cool namespace')

sodium.crypto_generichash(output, buf, key) // key is optional
var hex = output.toString('hex')
console.log(hex)
