const { data } = require("jquery");
var mongojs = require("mongojs")

//var _database = mongojs('localhost:27017/dodge', ['account'])
var _database = mongojs("mongodb+srv://testUser:testPassword@cluster0.euqmf.mongodb.net/<dodge>?retryWrites=true&w=majority", ['account'])

Database = {}

Database.correctPass = function(data,callback){
	_database.account.findOne({username:data.Usr,password:data.Pas},function(err,res){
        if (err) throw err
        if(res)
			callback(true)
		else
			callback(false)
	});
}

Database.takenUser = function(data, callback){
    _database.account.findOne({username:data.Usr},function(err,res){
        if (err) throw err
        if(res)
			callback(true)
		else
			callback(false)
	});
}

Database.addUser = function(data, callback) {
	_database.account.insert({username:data.Usr,password:data.Pas},function(err){
        if (err) throw err
        callback()
	})
}

Database.deleteUser = function(data, callback) {
    _database.account.remove({username:data.Usr, password:data.Pas}, function(err){
        if (err) throw err
        callback()
    })
}