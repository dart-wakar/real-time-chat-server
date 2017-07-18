var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var UserSchema = new Schema({
    username: String,
    status: {type: Number,default: 1},
    messages: [{type: Schema.Types.ObjectId,ref: 'MessageModel'}],
    rooms: [{type: Schema.Types.ObjectId,ref: 'RoomModel'}]
});

module.exports = mongoose.model('UserModel',UserSchema);