var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: String,
    messages: [{type: Schema.Types.ObjectId,ref: 'MessageModel'}]
});

module.exports = mongoose.model('UserModel',UserSchema);