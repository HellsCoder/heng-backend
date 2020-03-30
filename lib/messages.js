

const Messages = (scheme) => {

    let findErrorText = (code) => {
        for(let i = 0; i < scheme.errors.length; i++){
            let error = scheme.errors[i];
            if(error.code === code){
                return error.text;
            }
        }
        return "Unknown error";
    }

    return {
        makeError: function(code, text){
            if(!text){
                return {
                    "success": false,
                    "response": {
                        "code": code,
                        "error": {
                            "text": findErrorText(code)
                        }
                    }
                }
            }
            return {
                "success": false,
                "response": {
                    "code": code,
                    "error": text
                }
            };
        },
    
        makeSuccess: function(response){
            return {
                "success": true,
                "response": response
            }
        }
    }
}

module.exports = Messages;

