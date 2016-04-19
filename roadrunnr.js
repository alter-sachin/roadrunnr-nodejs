var request = require('request');
var fs      = require('fs');
var rp      = require('./rawParser.js');

var HOSTS = {
  production : 'http://roadrunnr.in/',
  test       : 'http://apitest.roadrunnr.in/'
};

var OrderRequest = {
  pickup: {
    user: {
      name: '',
      phone_no: '',
      email: '',
      type: '',
      external_id: '',
      full_address: {
        address: '',
        locality: {
          name: ''
        },
        sub_locality: {
          name: ''
        },
        city: {
          name: ''
        },
        geo: {
          latitude: '',
          longitude: ''
        }
      }
    }
  },
  drop: {
    user: {
      name: '',
      phone_no: '',
      email: '',
      type: '',
      external_id: '',
      full_address: {
        address: '',
        locality: {
          name: ''
        },
        sub_locality: {
          name: ''
        },
        city: {
          name: ''
        },
        geo: {
          latitude: '',
          longitude: ''
        }
      }
    }
  },
  order_details: {
    order_id: '',
    order_value: '',
    amount_to_be_collected: '',
    expected_delivery_time: '',
    order_type: {
      name: ''
    },
    order_items: [
      {
        quantity: 0,
        price: 0,
        item: {
          name: ''
        }
      }
    ],
    created_at : ''
  },
  callback_url: ''
};

var API = {
  SHIP           : 'v1/orders/ship',
  CANCEL         : 'v1/orders/',
  TRACK          : 'v1/orders/',
  SERVICEABILITY : 'v1/orders/serviceability/'
};

module.exports = {
  'env'             : 'production',
  'oauth_json_path' : './RoadRunnrOAuth.json',
  'config'          : {
    'CLIENT_ID'     : 'YOUR-CLIENT-ID',
    'CLIENT_SECRET' : 'YOUR-CLIENT-SECRET'
  },

  setOAuthPath : function(path) {
    try {
      fs.unlinkSync(this.oauth_json_path);
    } catch (e) {
      // console.log("No previous Roadrunnr OAuth file found");
      // console.log(e);
    }

    this.oauth_json_path = path;
  },

  setKeys : function(clientId, clientSecret) {
    this.config.CLIENT_ID     = clientId;
    this.config.CLIENT_SECRET = clientSecret;

    try {
      fs.unlinkSync(this.oauth_json_path);
    } catch (e) {
      // console.log("No previous Roadrunnr OAuth file found");
      // console.log(e);
    }
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
          'content-type'  : 'Application/JSON',
          'authorization' : 'Token ' + token
        },
        url     : HOSTS[env] + API.SHIP,
        body    : orderRequest,
        json    : true
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          checkRRErrors(body, callback);
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
          'content-type'  : 'Application/JSON',
          'authorization' : 'Token ' + token
        },
        url     : HOSTS[env] + API.TRACK + '/' + id + '/track/',
        json    : true
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          checkRRErrors(body, callback);
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
          'content-type'  : 'Application/JSON',
          'authorization' : 'Token ' + token
        },
        url     : HOSTS[env] + API.SERVICEABILITY,
        body    : orderRequest,
        json    : true
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          checkRRErrors(body, callback);
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
          'content-type'  : 'Application/JSON',
          'authorization' : 'Token ' + token
        },
        url     : HOSTS[env] + API.TRACK + '/' + id + '/cancel/',
        json    : true
      }, function(error, response, body){
        if (error) {
          console.error("Request error: " + error);
          callback(error, null);
        } else {
          checkRRErrors(body, callback);
        }
      });
    });
  },

  // Optional, requires 'geocoder' npm module
  // Run 'npm install geocoder' to use this method:
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

  rawParser : rp.rawParser
};

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
      'content-type'  : 'Application/JSON'
    },
    url     : HOSTS[env] + getTokenEP,
    json    : true
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
          lng: data.results[0].geometry.location.lng
        };
        callback(null, geo);
      }
    }
  });
}

function checkRRErrors(body, callback) {
  var error = null;

  if (body.errors != null) {
    error = body.errors;
  } else if (body.status != null) {
    if (body.status.code != null) {
      error = getErrorInfo(body.status.code);
    } else {
      error = getErrorInfo(parseInt(body.status));
    }
  }

  callback(error, body);
}

/**
 * Helper method to get information on Roadrunnr error codes
 * @param code Error code thrown by Roadrunnr APIs
 * @returns {{code: number, info: string}} Contains the error code and a small description of the error
 */
function getErrorInfo(code) {
  var error = {
    code: 0,
    info: ''
  };

  switch(code) {
    case 200:
      error = null;
      break;

    case 312:
      error.code = code;
      error.info = 'This area is not serviceable. Distance > 8km.';
      break;

    case 810:
      error.code = code;
      error.info = 'Insufficient balance in account. Please recharge to create shipments.';
      break;

    case 422:
      error.code = code;
      error.info = 'Some error in OrderRequest. Check response body for details.';
      break;

    case 500:
      error.code = code;
      error.info = 'Roadrunnr server error.';
      break;

    case 400:
      error.code = code;
      error.info = 'Bad request. Contact Roadrunnr tech support.';
      break;

    case 404:
      error.code = code;
      error.info = 'No input file specified. Contact Roadrunnr tech support.';
      break;

    case 706:
      error.code = code;
      error.info = 'No drivers available currently in the area. Retry in sometime.';
      break;

    case 310:
      error.code = code;
      error.info = 'The scheduled time is invalid. The scheduled delivery can be scheduled with a minimum of 2 hours from present time.';
      break;

    case 301:
      error.code = code;
      error.info = 'The order cannot be cancelled. Contact Roadrunnr tech support.';
      break;

    default:
      error.code = code;
      error.info = 'Unknown error from Roadrunnr. Check response for more details or contact tech support.';
      break;
  }

  return error;
}

/**
 * Helper method to read file in JSON format
 *
 * @param path     path/to/file/containing/json/object
 * @param options  Options passed onto fs.readFile method to get the file
 * @param callback
 */
function readFile(path, options, callback) {
  if (callback == null) {
    callback = options;
    options = {}
  }

  fs.readFile(path, options, function (err, data) {
    if (err) return callback(err);

    var obj;
    try {
      obj = JSON.parse(data, options ? options.reviver : null)
    } catch (err2) {
      err2.message = path + ': ' + err2.message;
      return callback(err2)
    }
    callback(null, obj)
  })
}

/**
 * Helper method to store a JSON type object to file
 *
 * @param path     The path where the file will be stored
 * @param obj      The JavaScript object to be stored
 * @param options  Options passed to the fs.writeFile function call to store the file
 * @param callback
 */
function writeFile(path, obj, options, callback) {
  if (callback == null) {
    callback = options;
    options = {}
  }

  var spaces = typeof options === 'object' && options !== null
    ? 'spaces' in options
    ? options.spaces : this.spaces
    : this.spaces;

  var str = '';
  try {
    str = JSON.stringify(obj, options ? options.replacer : null, spaces) + '\n'
  } catch (err) {
    if (callback) return callback(err, null)
  }

  fs.writeFile(path, str, options, callback)
}