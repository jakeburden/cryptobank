var assert = require('assert')
var net = require('net')
var jsonStream = require('duplex-json-stream')

var args = process.argv.slice(2)

var cmd = args[0]
var amount = args[1]

var stream = jsonStream(net.connect(3876))

stream.once('data', function (data) {
  console.log('Teller received:', data)
})

var commands = ['deposit', 'withdraw', 'balance']
var notFoundMsg =  'No command: (' + cmd + '). Commands are ' + commands
assert.notEqual(commands.indexOf(cmd), -1, notFoundMsg)

var msg = payload(cmd, parseFloat(amount, 10))
stream.end(msg)
console.log('Teller sent:', msg)

function payload (cmd, amount) {
  var msg = {}
  msg.command = cmd
  msg.amount = amount || 0
  return msg
}
