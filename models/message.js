var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var MessageSchema = new Schema({
    message: String,
    added: {type: Date,default: Date.now},
    user: {type: Schema.Types.ObjectId,ref: 'UserModel'},
    room: {type: Schema.Types.ObjectId,ref: 'RoomModel'}
});

module.exports = mongoose.model('MessageModel',MessageSchema);