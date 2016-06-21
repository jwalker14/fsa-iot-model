//include some libraries
var fs = require("fs");
var request = require('request');
//var gpio = require('onoff').Gpio, //raspberry pi usage
//connection for socket server
var socket = require('socket.io-client')('http://localhost:3000');

//for raspberry pi usage
// var led = new gpio(14, 'out');

//we have a config file with credentials lets put them in a safer place so we can ignore it..
var config = require('./config.json');

// create an empty device and json object
var device = {};
var json = {};

//send a request for a auth token
request.post(
{
  url:config.protocol + config.domain + ':' + config.port + '/device/auth',
  form: {
    token: config.token,
    device_id: config.id
  }
}, function(err,httpResponse,body){

  //try doing something with the token
  try{
    //store the JWT token we can use this for future request if needed
    //because we are now authenticated
    config.token = "Bearer " + JSON.parse(body).token ;

    //get the device json data
    request.get(config.protocol + config.domain + ':' + config.port + '/device/' + config.id, {
      'auth': {
        'bearer': JSON.parse(body).token
      }
    }, function(err, http, body){

      //we have the device json data
      json = JSON.parse(body);
      json.current_state = "On" //remove in production current_state should be a state not "null" we are cheating

      //write the json to a file so we have the device state at all times
      //this is important for runtimes. THe device is a Finite State Machine and we need to store
      //the state created online with the interface. 
      //
      //I firmly believe this is the best way to make this easy to use. -Jason
      fs.writeFile('device.json', JSON.stringify(json, null, 2), function(err){
        if(err) throw err; //if we have an error throw it.

        //assign the new file to device ensuring we are reading from the file.
        device = require('./device.json'); 

        //join the "chat room" so we are not broadcasting our business to the world
        //this may not be secure but it's better than nothing
        socket.emit('join', device._id);
      })
    })
  }
  catch(err){
    //throw the error if we have an issue
    throw(err)
  }
  
});

//assuming this is running async.
socket.on('connect', function(){
  //do what you have to here.
});


//sample event
socket.on('event', function(data){});

//when the user disconnects
socket.on('disconnect', function(){});


//for messages
socket.on('message', function (message) {
  console.log(message);
});

//very important socket event
socket.on('transition', function(key){

  //pass the desired state key into the transition function
  //receives new state
  var new_state = transition(key);

  //update the device FSA object with the new state
  device.current_state = new_state.key;
  //output out new state for debugging
  console.log(new_state.output);



  // do some stuff here on your raspberry pi..
  // led.writeSync(new_state.output);



  //write the file with the updated device FSA object
  fs.writeFile('device.json', JSON.stringify(device, null, 2))

  //@TODO save device back to mongo
  //save current_state back to MONGO
})

/**
 * Transition works by taking the desired new state input 
 * passing it through out transition function and
 * getting the resulting state from the FSA.
 *
 * complexity: n + 6
 * 
 * @param  {[type]} key){              var new_state [description]
 * @return {[type]}        [description]
 */
function transition(input){
  //some variables                                                                      COMPLEXITY
  var i = 0;                                                                            //1
  var state = transitions = next_state = output_state = null;                           //4

  //loop through the states to get the current matching state
  while(i < device.states.length){                                                      //loop by m
    //if the device.states.key match the device.current_state
    if(device.states[i].key.toLowerCase() == device.current_state.toLowerCase()){       //1m
      //which is does so lets get these possible transitions
      transitions = device.states[i].transitions;                                       //1
    }
    i++;                                                                                //1m
  }
  
  //reset back to 0
  i = 0                                                                                 //1
  //we want to get the transition for the input from the function call
  while(i < transitions.length){                                                        //loop by n
    //if the state matches the new state input key
    if(transitions[i].state == input)                                                   //1n
      //the next state is the current transitions so set it
      next_state = transitions[i]                                                       //1
    //continue
    i++;                                                                                //1n
  }

  
  //reset to 0
  i = 0;                                                                                //1
  //loop through the device states one more time
  while(i < device.states.length){                                                      //loop by m
    //if the device.state.key matches the next_state.state(key) we have 
    //found the output state
    if(device.states[i].key.toLowerCase() == next_state.state.toLowerCase()){           //1
      //we can just return now cause we found what we want no need to waste time
      return device.states[i]                                                           //1
    }

    //continue
    i++;                                                                                
  }

  //TOTAL COMPLEXITY -----------------------------------------------------------------  worst: 4m + 2n + 10 -- O(m + n)    
  //                                                                                //  best: 2m + 2n + 11 -- O(m + n)
  //                                                                                //  average: O(m + n)
}