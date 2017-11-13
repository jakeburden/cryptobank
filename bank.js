var net = require('net')
var fs = require('fs')
var jsonStream = require('duplex-json-stream')

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
  },
  'balance': function (sum, amount) {
    return sum + amount
  }
}

var server = net.createServer(function (stream) {
  stream = jsonStream(stream)
  stream.on('data', function (msg) {
    console.log('Bank recieved:', msg)

    var options = Object.keys(commands)
    var commandNotFound = options.indexOf(msg.command) === -1
    if (commandNotFound) return

    log.push(msg)

    var balance = log.reduce(function (sum, msg) {
      return commands[msg.command](sum, msg.amount)
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
