/**
 * Extremely Simple Socket Server for the most part.
 *
 * Some ideas
 * • Have the socket server interface with the API rather than the devices? (security)
 */

//start express the http serve and socket.io
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = 3000;

//have a higher scope variable of the device id
var device_id = null;

//route for just checking this works
//just send back the id
app.get('/:id', function(req, res){
  res.send(req.params.id);
});


//this is an important route!
//
//we have the id and the key as the params
//id: the id of the device or group of devices
//key: the state we want to transition to eg. "On"
app.get('/:id/transition/:key', function(req,res){

  //at this point ANYONE can hit the route and it will trigger the transition
  //this is incredibly insecure and there will need to be some middleware that handles
  //the authenticate of the client who is trying to trigger the transition
  //
  //for instance: the person is using their cell phone. 
  //they login we have a cookie or something similar
  //the user can authenticate that way. we will need 
  //to validate that the user is trying to trigger a transition
  //on a device that they have access to and QUICKLY.
  //
  // console.log(req.params.id) //for debugging
  
  // emit the transition event passing in the "chat room" id and the key e.g. "On"
  io.sockets.in(req.params.id).emit('transition', req.params.key);

  //send the user some message so it's not hanging
  //this can be elaborated on more later like adding error handling
  res.send({
    status: 200
  })
})

//just sned a simple hello
io.on('connection', function(socket){
  io.send("Hello User")

  //when a device connects the join unique "room" to communicate..
  // kind of like a therepist office where its just you and the therapist...
  // others can come in if you allow them to and you can communicate with all of them at once as well (groups)
  // it works the exact same way...think of have multiple lights in a room and you want to turn them all on...
  // they should be in a group
  socket.on('join', function(id){
    //call the join_room function (below)
    join_room(socket, id);
  })
});


//simple join function
function join_room(socket, id){
  device_id = id;   //set the device_id
  socket.join(id);  //join here to the room
  //send a message only to that device/group
  io.sockets.in(id).emit('message', "Device: " + id);
}


//for starting the server to pass RESTful commands to. port 3000
http.listen(port, function(){
  console.log('listening on *:3000');
});