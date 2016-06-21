var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var userSchema = new Schema({
	//
	email: {
		type: String,
		required:true,
		unique: true
	},
	username: {
		type: String,
		required: true,
		unique: true
	},
	password: {
		type: String,
		required: true
	},

	meta:{
		age: Number,
		website: String,
		first_name: String,
		last_name: String,
		admin: Boolean,
		location: {
			street: String,
			street2: String,
			city: String,
			state: String,
			zip: Number
		},
	},

	//resettable
	reset_password_token: String,
	reset_password_send_at: Date,
	//rememberable
	remember_created_at: Date,

	sign_in_count: Number,
	//stats
	current_sign_in_at: Date,
	last_sign_in_at: Date,

	//IPs
	current_sign_in_ip: String,
	last_sign_in_ip: String,

	//confirmable
	confirmation_token: String,
	confirmed_at: Date,
	confirmation_sent_at: Date,
	unconfirmed_email: String,

	created_at: Date,
	updated_at: Date,
	terms: Boolean,
	logged_in: Boolean,
	//oAuth
	provider: String,
	facebook: Object
});

var User = mongoose.model('User', userSchema);

module.exports = User;