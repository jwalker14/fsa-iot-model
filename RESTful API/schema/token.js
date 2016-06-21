var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var tokenSchema = new Schema({
  user_id: String,
  token_type: String,
  token: String,
})
var Token = mongoose.model('Token', tokenSchema);

module.exports = Token;