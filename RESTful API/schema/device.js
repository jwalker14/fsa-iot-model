var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// IM LOOKING FOR INPUT ON THIS MODEL
var deviceSchema = new Schema({
	user_id: String,
	name: String,
	description: String,
	states:[
		{
			key:String,
			output: Number,
			transitions:[
				{
					input: String,
					state: String, //index
				}
			]
		}
	],
	current_state: String //index
})

var Device = mongoose.model('Device', deviceSchema);

module.exports = Device;


/*

Reasons for the FSA model:
- Easily describe the states.
- Easily chains the states for the recipes/flow
	we can present them the states and they can chain them and create a flow
- If users store the data this way (were actually storing it this way for them)
	then we can reuse the data to model and improve the FSA...
- makes the device data fluid in terms of data to profit..

@TODO - finish modeling this device. Theoretically Test the device model.

example:

var device = new Device({
	user_id: String,
	name: String,
	description: String,
	states:[
		{
			key:String,
			output: String,
			transitions:[
				{
					input: String,
					state: Number, //index
				}
			]
		}
	],
	current_state: Number //index
})

current_state: 								Action:

0 														device.trigger("Off");
0 														device.trigger("On");
1 														device.trigger("Off");
0
*/