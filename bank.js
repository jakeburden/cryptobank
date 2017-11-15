var assert = require('assert')
var net = require('net')
var fs = require('fs')
var jsonStream = require('duplex-json-stream')
var sodium = require('sodium-native')

var log
try {
  log = require('./data.json')
} catch (e) {
  log = []
}

var commands = {
  'deposit': function (sum, amount) {
    return sum + amount
  },
  'withdraw': function (sum, amount) {
    return sum - amount
  }
}

commands.balance = commands.genesis = commands.withdraw

var genesisObj = {
  value: {
    command: 'genesis',
    amount: 0
  },
  hash: hashToHex('genesis hash')
}

log.push(genesisObj)

var server = net.createServer(function (stream) {
  stream = jsonStream(stream)
  stream.on('data', function (msg) {
    console.log('Bank recieved:', msg)

    var options = Object.keys(commands)
    var commandNotFound = options.indexOf(msg.command) === -1
    if (commandNotFound) return

    // append transaction to log
    var prevHash = log[log.length - 1].hash
    log.push({
      value: msg,
      hash: hashToHex(prevHash + JSON.stringify(msg))
    })

    var balance = log.reduce(function (sum, entry, idx) {
      if (idx !== 0) { // not genesis block
        // verify hash 
        var prevHash = log[idx - 1].hash
        var computedHash = hashToHex(prevHash + JSON.stringify(entry.value))
        assert.equal(computedHash, entry.hash)
      }
      return commands[entry.value.command](sum, entry.value.amount)
    }, 0)

    if (balance < 0) {
      log.pop()
      stream.write('Refused: not enough funding.')
      return
    }

    // formats and writes entire log to disk on every transaction
    // this should be optimized in the future
    var prettyLog = JSON.stringify(log, null, 2)
    fs.writeFile('data.json', prettyLog, function (err) {
      if (err) console.error(err)
    })

    stream.write({
      balance: balance
    })
  })
})

server.listen(3876)

function hashToHex (value) {
  var out = Buffer.alloc(sodium.crypto_generichash_BYTES)
  var buf = Buffer.from(value)
  sodium.crypto_generichash(out, buf)
  return out.toString('hex')
}
