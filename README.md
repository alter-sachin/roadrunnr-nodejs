# RoadRunnr NodeJs Wrapper
A javascript wrapper for RoadRunnr delivery service. In-built OAuth. You don't need to worry about getting and maintaining an access token. Just set your keys and you are good to go!

```
npm install roadrunnr
```

### Include and configure your keys
```javascript
var runnr = require('roadrunnr');
runnr.setKeys(CLIENT_ID, CLIENT_SECRET);
```

### APIs available
* [Create shipment](#create_shipment)
* [Track shipment](#track_shipment)
* [Cancel shipment](#cancel_shipment)
* [Check serviceability](#check_serviceability)

### Bonus
* [Auto assign lat long](#assign_lat_long)
* [Use test environment](#set_test_environment)
* [Set OAuth filepath](#set_oath_path)
* [Raw Parser middleware for Express](#raw_parser)

### <a name="create_shipment"></a>Create shipment
```javascript
var orderRequest = new runnr.OrderRequest();

// Add pickup details
orderRequest.pickup.user.name                           = '';
orderRequest.pickup.user.phone_no                       = '';
orderRequest.pickup.user.email                          = '';
orderRequest.pickup.user.type                           = '';
orderRequest.pickup.user.external_id                    = '';
orderRequest.pickup.user.full_address.address           = '';
orderRequest.pickup.user.full_address.locality.name     = ''; // Can be skipped, see below
orderRequest.pickup.user.full_address.sub_locality.name = ''; // Can be skipped, see below
orderRequest.pickup.user.full_address.city.name         = '';
orderRequest.pickup.user.full_address.geo.latitude      = plat; // Optional
orderRequest.pickup.user.full_address.geo.longitude     = plng; // Optional


// Add drop details
orderRequest.drop.user.name                             = '';
orderRequest.drop.user.phone_no                         = '';
orderRequest.drop.user.email                            = '';
orderRequest.drop.user.type                             = '';
orderRequest.drop.user.external_id                      = '';
orderRequest.drop.user.full_address.address             = '';
orderRequest.drop.user.full_address.locality.name     = ''; // Can be skipped, see below
orderRequest.drop.user.full_address.sub_locality.name = ''; // Can be skipped, see below
orderRequest.drop.user.full_address.city.name         = '';
orderRequest.drop.user.full_address.geo.latitude        = dlat; // Optional
orderRequest.drop.user.full_address.geo.longitude       = dlng; // Optional

// Order Details
orderRequest.order_details.order_id                 = '';
orderRequest.order_details.order_value              = '0';
orderRequest.order_details.amount_to_be_collected   = '0';
orderRequest.order_details.order_type.name          = 'CashOnDelivery';
orderRequest.order_details.order_items[0].quantity  = 1;
orderRequest.order_details.order_items[0].price     = 0;
orderRequest.order_details.order_items[0].item.name = '';
orderRequest.order_details.created_at               = "YYYY-MM-DD hh: MM";

orderRequest.callback_url = 'your.domain/url'; // OPTIONAL

runnr.createShipment(orderRequest, function(error, response) {
  console.log(response);
});
```
Roadrunnr allows you to skip the "locality" and "sub_locality" parameters if you provide the accurate lat & long for the addresses. I've added a geocoder which converts the address almost accurate lat long. [Instrutions here](#assign_lat_long).

### <a name="track_shipment"></a>Track shipment
```javascript
runnr.trackShipment(id, function(error, response) {
  if (error == null) {
    console.log(response);
  }
});
```

### <a name="cancel_shipment"></a>Cancel shipment
```javascript
runnr.cancelShipment(id, function(error, response) {
  if (error == null) {
    console.log(response);
  }
});
```

### <a name="check_serviceability"></a>Check serviceability
```javascript
runnr.checkServiceability(orderRequest, function(error, response) {
  if (error == null) {
    console.log(response);
  }
});
```

#### <a name="assign_lat_long"></a>(OPTIONAL) Auto assign lat & long
Please run ```npm install geocoder``` before using the following function. You can skip the ```locality``` and ```sub_locality``` fields using this. 
IMPORTANT NOTE : This function geocodes the address in ```orderRquest.pickup.user.full_address.address``` and ```orderRequest.drop.user.full_address.address```. Make sure this the complete address which includes the city name and the pin code.
```javascript
orderRequest.pickup.user.full_address.locality.name     = 'BYPASS_LOCALITY';
orderRequest.pickup.user.full_address.sub_locality.name = ''; // Can be left blank

orderRequest.drop.user.full_address.locality.name     = 'BYPASS_LOCALITY';
orderRequest.drop.user.full_address.sub_locality.name = '';  // Can be left blank

runnr.assignLatLong(orderRequest, function(error, newOrderRequest) {
  if (error) {
    // There was some error geocoding one of the addresses
  } else {
    runnr.createShipment(newOrderRequest, function(error, response) {
      if (error == null) {
        console.log(response);
      }
    });
  }
});
```

#### <a name="set_test_environment"></a>(OPTIONAL) Use test environment
To use Roadrunnr's test portal, just change the environment. This module uses the production server by default.
```javascript
runnr.setEnvironment('test');
```

#### <a name="set_oath_path"></a>(OPTIONAL) Change OAuth token filepath
To use Roadrunnr's test portal, just change the environment. This module uses the production server by default.
```javascript
runnr.setOAuthPath('./path/to/OAuth/file.json');
```

#### <a name="raw_parser"></a>(OPTIONAL) RawParser middleware for Express
Roadrunnr callbacks are of type `application/octet-stream`, and rawBody has been dropped from the request object in newer versions of Express. Here is a simple rawbody parser for roadrunnr callbacks
```javascript
app.post('/roadRunnr/callback', RR.rawParser, function(req,res) {
  console.log(req.rawBody);
  res.send(req.rawBody);
});
```

---
### Submit issues
You can raise an issue in this repo or mail me at sidhant@hashexclude.com
