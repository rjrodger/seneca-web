/* Copyright (c) 2010-2015 Richard Rodger */
'use strict'

var _ = require('lodash')
var Assert = require('assert')
var Seneca = require('seneca')
var Success = require('success')

var Lab = require('lab')
var lab = exports.lab = Lab.script()
var suite = lab.suite
var test = lab.test


suite('configuration suite', function () {
  test('empty', function (done) {
    var si = Seneca({log: 'silent', default_plugins: { web: false }})
    si.use('../web.js')
    si.act({role: 'web', use: {pin: {}, map: {}}}, done)
  })


  test('bad', function (done) {
    var si = Seneca({
      log: 'silent', debug: {undead: true}, default_plugins: { web: false }, errhandler: function (err) {
        Assert.equal(err.message.indexOf('seneca: Action'), 0)
        done()
        // prevent multiple callbacks
        done = _.noop
      }
    })
    si.use('../web.js')
    si.use(function bad () {
      this.act({role: 'web', use: {}})
    })
  })


  test('config', function (done) {
    var si = Seneca({log: 'silent', default_plugins: { web: false }})
    si.use('../web.js')
    si.act(
      {
        role: 'web',
        use: {
          pin: {},
          map: {}
        },
        config: {a: 1},
        plugin: 'aaa'
      },
      function (err, out) {
        Assert.ok(null == err)

        si.act({role: 'web', get: 'config', plugin: 'aaa'}, function (err, out) {
          Assert.ok(null == err)
          Assert.equal(out.a, 1)
          done()
        })
      }
    )
  })

  test('source', function (done) {
    var si = Seneca({log: 'silent', default_plugins: { web: false }})
    si.use('../web.js')
    si.act(
      {
        role: 'web',
        set: 'source',
        title: 't1',
        source: 's1'
      },
      function (err, out) {
        Assert.ok(null == err)

        si.act({role: 'web', get: 'sourcelist'}, function (err, out) {
          //console.log(out)
          Assert.ok(null == err)
          Assert.equal(out.length, 1)
          Assert.equal('\n;// t1\ns1', out[0])
          done()
        })
      }
    )
  })


  test('plugin with object mapping', testPlugin({
    zig: true,
    bar: {GET: true},
    qaz: {GET: true, POST: true}
  }))

  test('plugin with array mapping', testPlugin([
    {route: 'zig'},
    {route: 'bar', GET: true},
    {route: 'qaz', GET: true, POST: true}
  ]))

  function testPlugin (mapping) {
    return function (done) {
      var si = Seneca({log: 'silent', errhandler: done, default_plugins: { web: false }})
      si.use('../web.js')

      si.use(function qaz () {
        this.add('role:foo,cmd:zig', function (args, done) {
          done(null, {bar: args.zoo + 'g'})
        })
        this.add('role:foo,cmd:bar', function (args, done) {
          done(null, {bar: args.zoo + 'b'})
        })
        this.add('role:foo,cmd:qaz', function (args, done) {
          done(null, {qaz: args.zoo + 'z'})
        })

        this.act('role:web', {
          use: function (req, res, next) {
            next()
          }
        })

        this.act({
          role: 'web',
          use: {
            prefix: '/foo',
            pin: {role: 'foo', cmd: '*'},
            map: mapping
          }
        })
      })

      si.ready(function () {
        si.act('role:web,list:service', Success(done, function (out) {
          Assert.equal(out.length, 3)

          si.act('role:web,list:route', Success(done, function (out) {
            Assert.equal(out.length, 4)

            si.act({role: 'web', stats: true}, Success(done, function (out) {
              Assert.equal(4, _.keys(out).length)
              done()
            }))
          }))
        }))
      })
    }
  }
})
