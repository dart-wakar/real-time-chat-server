var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var RoomSchema = new Schema({
    name: String,
    users: [{type: Schema.Types.ObjectId,ref: 'UserModel'}],
    messages: [{type: Schema.Types.ObjectId,ref: 'MessageModel'}],
    created_on: {type: Date,default: Date.now}
});

module.exports = mongoose.model('RoomModel',RoomSchema);