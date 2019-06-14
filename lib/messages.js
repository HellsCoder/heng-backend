var Messages = {
    makeError: function(code, text){
        return {
            "error":{
                "code" : code,
                "message": text
            }
        };
    },

    makeSuccess: function(response){
        return {
            "success": {
                "response" : response
            }
        }
    }
};

module.exports = Messages;