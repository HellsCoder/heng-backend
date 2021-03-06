const mysqlWrapper = require('../database');
const Schema = mysqlWrapper.Schema;


const userSchema = new Schema('users', {
    'id' : {
        AUTO_INCREMENT: true,
        length: 16,
        type: Number
    },
    
    'username': {
        length: 32,
        type: String
    }
});

module.exports = mysqlWrapper.model(userSchema);
