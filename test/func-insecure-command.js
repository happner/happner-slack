/**
 * Created by nomilous on 2016/09/03.
 */

var path = require('path');
var filename = path.basename(__filename);
var should = require('should');
var Happner = require('happner');
var request = require('request');
var http = require('http');
var EventEmitter = require('events').EventEmitter;

describe(filename, function() {

  before('start "slack" server', function(done) {
    var _this = this;
    this.emitter = new EventEmitter();
    this.http = http.createServer(function(req, res) {
      var body = '';
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
        },
        'definedComponent': {
          instance: {
            definedMethod: function(payload, callback) {
              callback(null, {
                text: "Some response text."
              })
            },
            errorMethod: function(payload, callback) {
              callback(new Error('problem'));
            }
          }
        }
      },
      components: {
        'happner-slack': {
          $configure: function(defaultConfig) {
            var config = defaultConfig.component.config;
            config.command.tokens.push('GOODTOKEN');
            return defaultConfig;
          }
        },
        'definedComponent': {}
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

  it('responds 400 bad request if not post', function(done) {
    request.get('http://localhost:55000/happner-slack/command', function(err, res, body) {
      try {
        res.statusCode.should.equal(400);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('responds 400 bad request if not urlencoded form', function(done) {
    request.post('http://localhost:55000/happner-slack/command', function(err, res, body) {
      try {
        res.statusCode.should.equal(400);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('responds 403 forbidden if no token is posted', function(done) {
    request.post({
      url: 'http://localhost:55000/happner-slack/command',
      form: {
        // token: 'GOODTOKEN' // no token
      }
    }, function(err, res, body) {
      try {
        res.statusCode.should.equal(403);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('responds 403 forbidden if bad token is posted', function(done) {
    request.post({
      url: 'http://localhost:55000/happner-slack/command',
      form: {
        token: 'BADTOKEN'
      }
    }, function(err, res, body) {
      try {
        res.statusCode.should.equal(403);
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('responds with missing component/method in url', function(done) {
    request.post({
      url: 'http://localhost:55000/happner-slack/command',
      form: {
        token: 'GOODTOKEN'
      }
    }, function(err, res, body) {
      try {
        res.headers['content-type'].should.equal('application/json');
        JSON.parse(body).text.should.equal('Error: Unspecified component/method in url');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('responds with missing component/method', function(done) {
    request.post({
      url: 'http://localhost:55000/happner-slack/command/missingComponent/missingMethod',
      form: {
        token: 'GOODTOKEN'
      }
    }, function(err, res, body) {
      try {
        res.headers['content-type'].should.equal('application/json');
        JSON.parse(body).text.should.equal('Error: Missing missingComponent/missingMethod (component/method)');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('responds with method in progress', function(done) {
    request.post({
      url: 'http://localhost:55000/happner-slack/command/definedComponent/definedMethod',
      form: {
        token: 'GOODTOKEN',
        command: '/command',
        text: 'text parameters',
        response_url: 'http://localhost:8080/response/1'
      }
    }, function(err, res, body) {
      try {
        res.headers['content-type'].should.equal('application/json');
        JSON.parse(body).text.should.equal('Running: /command text parameters');
        done();
      } catch (e) {
        done(e);
      }
    });
  });

  it('calls the corresponding method and posts response to slack hook', function(done) {
    this.emitter.on('/response/2', function(headers, body) {
      try {
        headers['content-type'].should.equal('application/json');
        body.should.eql({
          text: 'Some response text.'
        });
        done();
      } catch (e) {
        done(e);
      }
    });

    request.post({
      url: 'http://localhost:55000/happner-slack/command/definedComponent/definedMethod',
      form: {
        token: 'GOODTOKEN',
        command: '/command',
        text: 'text parameters',
        response_url: 'http://localhost:8080/response/2'
      }
    }, function(err, res, body) {
      if (err) return done(err);
    });
  });

  it('responds with error', function(done) {
    this.emitter.on('/response/3', function(headers, body) {
      try {
        headers['content-type'].should.equal('application/json');
        body.should.eql({
          text: 'Error: problem'
        });
        done();
      } catch (e) {
        done(e);
      }
    });

    request.post({
      url: 'http://localhost:55000/happner-slack/command/definedComponent/errorMethod',
      form: {
        token: 'GOODTOKEN',
        command: '/command',
        text: 'text parameters',
        response_url: 'http://localhost:8080/response/3'
      }
    }, function(err, res, body) {
      if (err) return done(err);
    });
  });

});
