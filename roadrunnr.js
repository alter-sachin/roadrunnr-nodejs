var request = require('request');
var fs      = require('fs');

var HOSTS = {
  production : 'http://roadrunnr.in/',
  test       : 'http://128.199.241.199/'
}

var OrderRequest = {
  pickup: {
    user: {
      name: '',
      phone_no: '',
      email: '',
      type: 'merchant',
      external_id: 'BLR-aafe',
      full_address: {
        address: '',
        locality: {
         name: '',
        },
        sub_locality: {
         name: '',
        },
        city: {
          name: '',
        },
        geo: {
          latitude: '',
          longitude: '',
        },
      },
    },
  },
  drop: {
    user: {
      name: '',
      phone_no: '',
      email: '',
      type: 'customer',
      external_id: 'BLR-aafe',
      full_address: {
        address: '',
        locality: {
         name: '',
        },
        sub_locality: {
         name: '',
        },
        city: {
          name: '',
        },
        geo: {
          latitude: '',
          longitude: '',
        },
      },
    },
  },
  order_details: {
    order_id: '',
    order_value: '',
    amount_to_be_collected: '',
    expected_delivery_time: '',
    order_type: {
      name: '',
    },
    order_items: [
      {
        quantity: 0,
        price: 0,
        item: {
          name: '',
        }
      },
    ],
    created_at : '',
  },
  callback_url: '',
}

var API = {
  SHIP           : 'v1/orders/ship',
  CANCEL         : 'v1/orders/',
  TRACK          : 'v1/orders/',
  SERVICEABILITY : 'v1/orders/serviceability/',
}

module.exports = {
  'env'             : 'production',
  'oauth_json_path' : './RoadRunnrOAuth.json',
  'config'          : {
    'CLIENT_ID'     : 'YOUR-PRODUCTION-CLIENT-ID',
    'CLIENT_SECRET' : 'YOUR-PRODUCTION-CLIENT-SECRET',
  },

  setRoadrunnrOAuthPath : function(path) {
    this.oauth_json_path = path;
  },

  setKeys : function(clientId, clientSecret) {
    this.config.CLIENT_ID     = clientId;
    this.config.CLIENT_SECRET = clientSecret;
  },

  setEnvironment : function(env) {
    if (env == "test" || env == "production") {
      this.env = env;
    } else {
      console.error('Invalid environment. Valid options : ["test, "production"]')
    }
  },

  OrderRequest : function() {
    return OrderRequest;
  },

  createShipment : function(orderRequest, callback) {
    var env = this.env;
    getOAuthToken(this.oauth_json_path, this.config, env, function(error, token) {
      request.post({
        headers : {
          'cache-control' : 'no-cache',
          'content-type'  : 'Application/JSOn',
          'authorization' : 'Token ' + token,
        },
        url     : HOSTS[env] + API.SHIP,
        body    : orderRequest,
        json    : true,
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          callback(null, body);
        }
      });
    });
  },

  trackShipment : function(id, callback) {
    var env = this.env;
    getOAuthToken(this.oauth_json_path, this.config, env, function(error, token) {
      request.get({
        headers : {
          'cache-control' : 'no-cache',
          'content-type'  : 'Application/JSOn',
          'authorization' : 'Token ' + token,
        },
        url     : HOSTS[env] + API.TRACK + '/' + id + '/track/',
        json    : true,
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          callback(null, body);
        }
      });
    });
  },

  checkServiceability : function(orderRequest, callback) {
    var env = this.env;
    getOAuthToken(this.oauth_json_path, this.config, env, function(error, token) {
      request.post({
        headers : {
          'cache-control' : 'no-cache',
          'content-type'  : 'Application/JSOn',
          'authorization' : 'Token ' + token,
        },
        url     : HOSTS[env] + API.SERVICEABILITY,
        body    : orderRequest,
        json    : true,
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          callback(null, body);
        }
      });
    });
  },

  cancelShipment : function(id, callback) {
    var env = this.env;
    getOAuthToken(this.oauth_json_path, this.config, env, function(error, token) {
      request.get({
        headers : {
          'cache-control' : 'no-cache',
          'content-type'  : 'Application/JSOn',
          'authorization' : 'Token ' + token,
        },
        url     : HOSTS[env] + API.TRACK + '/' + id + '/cancel/',
        json    : true,
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          callback(null, body);
        }
      });
    });
  },

  // Optional, requires 'geocoder' npm module
  assignLatLong : function(orderRequest, callback) {
    getLatLngForAddress(orderRequest.pickup.user.full_address.address, function(error, pickupGeo) {
      if (error) {
        callback(error, null);
      } else {
        getLatLngForAddress(orderRequest.drop.user.full_address.address, function(error, dropGeo) {
          if (error) {
            callback(error, null);
          } else {
            orderRequest.pickup.user.full_address.geo.latitude  = pickupGeo.lat;
            orderRequest.pickup.user.full_address.geo.longitude = pickupGeo.lng;

            orderRequest.drop.user.full_address.geo.latitude  = dropGeo.lat;
            orderRequest.drop.user.full_address.geo.longitude = dropGeo.lng;
            callback(null, orderRequest);
          }
        });
      }
    });
  },
}

function getOAuthToken(path, config, env, callback) {
  readFile(path, function(err, obj) {
    if (err) {
      getNewToken(path, config, env, callback);
    } else {
      callback(null, obj.access_token);
    }
  });
}

function getNewToken(path, config, env, callback) {
  var getTokenEP = 'oauth/token?grant_type=client_credentials&client_id=' + config.CLIENT_ID + '&client_secret=' + config.CLIENT_SECRET;
  request.get({
    headers : {
      'cache-control' : 'no-cache',
      'content-type'  : 'Application/JSOn',
    },
    url     : HOSTS[env] + getTokenEP,
    json    : true,
  }, function(error, response, body) {
    if (error == null) {
      if (body.error) {
        console.error("Error returned from Roadrunnr: ", body.error);
        console.log("Results: " + body);
        callback(body.error, body);
      } else {
        writeFile(path, body, function (err) {
          if (err) {
            console.error('Write error: ' + err);
          }
          callback(err, body.access_token);
        });
      }
    } else {
      callback(error, error);
    }
  });
}

function getLatLngForAddress(addressString, callback) {
  var geocoder = require('geocoder');
  addressString = addressString.replace(/,/g, ""); // Stripping unwanted commas
  geocoder.geocode(addressString, function (err, data) {
    if (err) {
      callback(err, null)
    } else {
      if (data.results.length < 1) {
        console.error("Couldn't geocode the address");
        callback('geocode lat lng not found', null);
      } else {
        var geo = {
          lat: data.results[0].geometry.location.lat,
          lng: data.results[0].geometry.location.lng,
        }
        callback(null, geo);
      }
    }
  });
}

function readFile (file, options, callback) {
  if (callback == null) {
    callback = options
    options = {}
  }

  fs.readFile(file, options, function (err, data) {
    if (err) return callback(err)

    var obj
    try {
      obj = JSON.parse(data, options ? options.reviver : null)
    } catch (err2) {
      err2.message = file + ': ' + err2.message
      return callback(err2)
    }
    callback(null, obj)
  })
}

function writeFile (file, obj, options, callback) {
  if (callback == null) {
    callback = options
    options = {}
  }

  var spaces = typeof options === 'object' && options !== null
    ? 'spaces' in options
    ? options.spaces : this.spaces
    : this.spaces

  var str = ''
  try {
    str = JSON.stringify(obj, options ? options.replacer : null, spaces) + '\n'
  } catch (err) {
    if (callback) return callback(err, null)
  }

  fs.writeFile(file, str, options, callback)
}