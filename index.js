var express = require('express');
var app = express();
var router = express.Router();
var morgan = require('morgan');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var http = require('http').createServer(app);
var io = require('socket.io')(http);

mongoose.connect('mongodb://localhost/realTimeChat');
var UserModel = require('./models/user');
var MessageModel = require('./models/message');
var RoomModel = require('./models/room');

router.use(function(req,res,next) {
    res.header("Access-Control-Allow-Origin","*");
    res.header("Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods","*");
    console.log('An api request is made');
    next();
});

router.get('/',function(req,res) {
    console.log("Welcome to the api")
    res.json({message: 'Welcome to the api'});
});

io.on('connection',function(socket) {

    console.log('A User connected!');

    socket.on('login',function(username) {
        socket.username = username;
        UserModel.findOne({username: socket.username},function(err,user) {
            if(err) {
                console.log(err);
            } else if(user === null) {
                console.log("New user!");
                var newuser = new UserModel();
                newuser.username = socket.username;
                newuser.save(function(err,usr) {
                    if(err) {
                        console.log(err);
                    }
                    usr.status = 2;
                    usr.save(function(err,ur) {
                        if(err) {
                            console.log(err);
                        }
                        socket.user_id = ur._id;
                        io.emit('new user connected',{user: ur,time: Date.now()});
                    });
                });
            } else {
                console.log("Existing user");
                user.status = 2;
                user.save(function(err,usr) {
                    if(err) {
                        console.log(err);
                    }
                    socket.user_id = usr._id;
                    io.emit('new user connected',{user: usr,time: Date.now()});
                });
            }
        });
    });

    socket.on('disconnect',function() {
        console.log(socket.username+' disconnected');
        console.log(socket.user_id+' disconnected');
        UserModel.findOne({username: socket.username},function(err,user) {
            if(err){
                console.log(err);
            } else if(user === null) {
                console.log('nobody logged in!');
            } else {
                user.status = 1;
                user.save(function(err,usr) {
                    if(err){
                        console.log(err);
                    }
                    io.emit('offline user',{user: usr});
                    socket.broadcast.emit('user disconnect',{disconnected_username: socket.username,disconnect_time: Date.now()});
                });
            }      
        });
    });

    socket.on('msg',function(msg) {
        console.log('New msg received');
        UserModel.findOne({username: socket.username},function(err,user) {
            if(err) {
                console.log(err);
            } else {
                var message = new MessageModel();
                message.message = msg;
                message.user = user._id;
                message.save(function(err,mesg) {
                    if(err) {
                        console.log(err);
                    }
                    user.messages.push(mesg._id);
                    user.save(function(err,usr) {
                        console.log("success");
                        io.emit('msg',{username: socket.username,msg: mesg});
                    })
                });
            }
        });
    });

    socket.on('user typing',function(message) {
        console.log(socket.username+' typing');
        socket.broadcast.emit('typing now',{username: socket.username});
    });

    socket.on('stop typing',function(msg) {
        console.log(socket.username+' stopped typing');
        socket.broadcast.emit('stopped typing',{username: socket.username});
    });

    socket.on('do private chat',function(user) {
        var currentUserIdString = new String();
        var otherUserIdString = new String();
        var privateChatRoomString = new String();
        currentUserIdString = socket.user_id.toString();
        otherUserIdString = user._id.toString();
        switch(currentUserIdString.localeCompare(otherUserIdString)) {
            case -1:
                privateChatRoomString = currentUserIdString+otherUserIdString;
                break;
            case 0:
                privateChatRoomString = currentUserIdString+otherUserIdString;
                break;
            case 1:
                privateChatRoomString = otherUserIdString+currentUserIdString;
        }
        console.log(privateChatRoomString);
        //createOrGetRoom(privateChatRoomString);
        RoomModel.findOne({name: privateChatRoomString},function(err,room) {
            if(err) {
                console.log(err);
            } else if(room === null) {
                console.log('creating new room');
                var new_room = new RoomModel();
                new_room.name = privateChatRoomString;
                new_room.users.push(socket.user_id);
                new_room.users.push(user._id);
                new_room.save(function(err,newroom) {
                    if(err) {
                        console.log(err);
                    }
                    console.log('new room created !');
                    socket.join(privateChatRoomString,function(err) {
                        if(err) {
                            console.log(err);
                        }
                        console.log('success');
                        socket.current_room = privateChatRoomString;
                        socket.emit('go to private chat',{room: newroom,current_user_id: socket.user_id,other_user: user});
                    });
                });
            } else {
                console.log('existing room');
                socket.join(privateChatRoomString,function(err) {
                    if(err) {
                        console.log(err);
                    }
                    console.log('success');
                    socket.current_room = privateChatRoomString;
                    socket.emit('go to private chat',{room: room,current_user_id: socket.user_id,other_user: user});
                });
            }
        });
    });

    socket.on('send private message',function(data) {
        RoomModel.findOne({name: socket.current_room},function(err,room) {
            if(err) {
                console.log(err);
            } else {
                var new_message = new MessageModel();
                new_message.message = data.message;
                new_message.user = socket.user_id;
                new_message.room = room._id;
                new_message.save(function(err,msg) {
                    if(err) {
                        console.log(err);
                    } else {
                        UserModel.findById(socket.user_id,function(err,user) {
                            user.messages.push(msg._id);
                            user.save(function(err,usr) {
                                if(err) {
                                    console.log(err);
                                } else {
                                    room.messages.push(msg._id);
                                    room.save(function(err,rm) {
                                        if(err) {
                                            console.log(err);
                                        } else {
                                            MessageModel.findById(msg._id)
                                                .populate('user')
                                                .exec(function(err,mg) {
                                                    if(err){
                                                        console.log(err);
                                                    } else {
                                                        console.log('Damn successful !');
                                                        io.to(socket.current_room).emit('got private message',{sender: socket.username,message: mg,other_user_id: data.otherUserId,room: rm});
                                                    }
                                                })
                                        }
                                    });
                                }
                            });
                        });
                    }
                });
            }
        });
        //io.to(socket.current_room).emit('got private message',{sender: socket.username,message: data.message,other_user_id: data.otherUserId});
    });

    socket.on('request for room name',function(other_user_id) {
        console.log('ggwp');
         var currentUserIdString = new String();
         var otherUserIdString = new String();
         var privateChatRoomString = new String();
         currentUserIdString = socket.user_id.toString();
         otherUserIdString = other_user_id.toString();
         switch(currentUserIdString.localeCompare(otherUserIdString)) {
             case -1:
                 privateChatRoomString = currentUserIdString+otherUserIdString;
                 break;
             case 0:
                 privateChatRoomString = currentUserIdString+otherUserIdString;
                 break;
             case 1:
                 privateChatRoomString = otherUserIdString+currentUserIdString;
         }
         RoomModel.findOne({name: privateChatRoomString},function(err,room) {
             if(err) {
                 console.log(err);
             }
             console.log(socket.current_room);
             io.to(socket.current_room).emit('take room name',room)
         });
     });

});

router.route('/users')
    .get(function(req,res) {
        UserModel.find(function(err,users) {
            if(err) {
                res.send(err);
            }
            res.json(users);
        });
    });

router.route('/user/:user_id')
    .get(function(req,res) {
        UserModel.findById(req.params.user_id)
            .populate('messages')
            .exec(function(err,user) {
                if(err) {
                    res.send(err);
                }
                res.json(user);
            });
    });

router.route('/user/delete')
    .post(function(req,res) {
        UserModel.remove({_id: req.body.user_id},function(err,user) {
            if(err) {
                res.send(err);
            }
            res.json({message: 'Successfully deleted !'});
        });
    });

router.route('/messages')
    .get(function(req,res) {
        MessageModel.find()
                    .populate('user')
                    .exec(function(err,messages) {
                        if(err) {
                            res.send(err);
                        }
                        res.json(messages);
                    });
    });

router.route('/message/delete')
    .post(function(req,res) {
        MessageModel.remove({_id: req.body.message_id},function(err,message) {
            if(err) {
                res.send(err);
            }
            res.json({message: 'Successfully deleted!'});
        });
    });

router.route('/messages/before')
    .get(function(req,res) {
        MessageModel.find({added: {$lte: Date.now()}},function(err,messages) {
            if(err) {
                res.send(err);
            }
            res.json(messages);
        });
    });

router.route('/users/online')
    .get(function(req,res) {
        UserModel.find({status: 2},function(err,users) {
            if(err) {
                res.send(err);
            }
            res.json(users);
        });
    });

router.route('/users/offline')
    .get(function(req,res) {
        UserModel.find({status: 1},function(err,users) {
            if(err) {
                res.send(err);
            }
            res.json(users);
        });
    });

router.route('/rooms')
    .get(function(req,res) {
        RoomModel.find(function(err,rooms) {
            if(err) {
                res.send(err);
            }
            res.json(rooms);
        });
    });

router.route('/room/delete')
    .post(function(req,res) {
        RoomModel.remove({_id: req.body.room_id},function(err,room) {
            if(err) {
                res.send(err);
            }
            res.json({message: 'Successfully deleted !'});
        });
    });

router.route('/room/fromroomname')
    .post(function(req,res) {
        RoomModel.findOne({name: req.body.room_name},function(err,room) {
            if(err) {
                res.send(err);
            }
            res.json(room);
        });
    });

router.route('/messages/default')
    .get(function(req,res) {
        MessageModel.find({room: null})
            .populate('user')
            .exec(function(err,messages) {
                if(err) {
                    res.send(err);
                }
                res.json(messages);
            });
    });

router.route('/messages/byroomid')
    .post(function(req,res) {
        MessageModel.find({room: req.body.room_id})
            .populate('user')
            .exec(function(err,messages) {
                if(err) {
                    res.send(err);
                }
                res.json(messages);
            });
    });

var db = mongoose.connection;
db.on('error',console.error.bind(console,'connection error: '));
db.once('open',function() {
    console.log('Connected to database !');
});

app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use('/api',router);
app.listen(3001);

http.listen(3000,function() {
    console.log('Websocket listening on 3000');
})