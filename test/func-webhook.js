/**
 * Created by nomilous on 2016/09/04.
 */

var path = require('path');
var filename = path.basename(__filename);
var should = require('should');
var Happner = require('happner');
var http = require('http');
var EventEmitter = require('events').EventEmitter;
var slackUrlBase = 'http://localhost:8080';

describe(filename, function() {

  before('start "slack" server', function(done) {
    var _this = this;
    this.emitter = new EventEmitter();
    this.http = http.createServer(function(req, res) {
      var body = '';
      if (req.url === '/test/error') {
        res.statusCode = 500;
        return res.end();
      }
      req.on('data', function(buf) {
        body += buf.toString();
      });
      req.on('end', function() {
        _this.emitter.emit(req.url, req.headers, JSON.parse(body));
      });
    });
    this.http.listen(8080, done);
  });

  after('stop "slack" server', function() {
    this.http.close();
  });

  before('start server', function(done) {
    var _this = this;
    Happner.create({
      name: 'Server',
      modules: {
        'happner-slack': {
          path: path.dirname(__dirname)
        }
      },
      components: {
        'happner-slack': {
          $configure: function(defaultConfig) {
            var config = _this.config = defaultConfig.component.config;
            return defaultConfig;
          }
        }
      }
    }).then(function(mesh) {
      _this.server = mesh;
      done();
    }).catch(done);
  });

  after('stop server', function(done) {
    if (this.server) {
      this.server.stop(done);
      return;
    }
    done();
  });

  it('errors on missing webhook url', function(done) {
    this.server.exchange['happner-slack'].post({})
      .then(function() {
        done(new Error('should not succeed'))
      })
      .catch(function(error) {
        try {
          error.toString().should.equal('Error: missing config.webhook.url');
          done();
        } catch (e) {
          done(e);
        }
      });
  });

  it('posts message as is to slack', function(done) {
    this.config.webhook.url = slackUrlBase + '/test/1';
    this.emitter.on('/test/1', function(headers, body) {
      try {
        headers['content-type'].should.equal('application/json');
        body.text.should.equal('Some text');
        done();
      } catch (e) {
        done(e);
      }
    });

    this.server.exchange['happner-slack'].post({
      text: 'Some text'
    }).catch(done);
  });

  it('error on bad slack url', function(done) {
    this.config.webhook.url = 'http://localhost:10203'; // nonexistent
    this.server.exchange['happner-slack'].post({
      text: 'Some text'
    })
      .then(function() {
        done(new Error('should not succeed'));
      })
      .catch(function(error) {
        try {
          error.code.should.equal('ECONNREFUSED');
          done();
        } catch (e) {
          done(e);
        }
      });
  });

  it('errors if slack responds with something other that 200', function(done) {
    this.config.webhook.url = slackUrlBase + '/test/error';
    this.server.exchange['happner-slack'].post({
      text: 'Some text'
    })
      .then(function() {
        done(new Error('should not succeed'));
      })
      .catch(function(error) {
        try {
          error.toString().should.equal('Error: slack api error');
          error.statusCode.should.equal(500);
          done();
        } catch (e) {
          done(e);
        }
      });
  })

});
