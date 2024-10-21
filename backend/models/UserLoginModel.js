const mongoose=require("mongoose");
const bcrypt = require('bcrypt'); //package that hash passwords
const cron = require('node-cron') //this is a package to schedule a deletion at report Collection

const UserLoginSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, 'Please enter a name'],
        unique: true
    },
    password:{
        type:String,
        required:[true, 'Please enter a password'],
        minlength: [8, 'Minimum password length is 8 characters']
    },
    /*new code here*/
    role:{
        type:String,
        default:"user"
    },
    isApproved:{  //This is for user requests, the master admin should change the value into true
        type: Boolean,
        default: false
    },
    question1:{
        type: String,
        required: true
    },
    answer1:{
        type: String,
        required: [true, 'Please provide an answer']
    },
    question2:{
        type: String,
        required: true
    },
    answer2:{
        type: String,
        required: [true, 'Please provide an answer']
    },
    question3:{
        type: String,
        required: true
    },
    answer3:{
        type: String,
        required: [true, 'Please provide an answer']
    }
},
{
    timestamps: true, //date created
})

//fire a function before the doc saved to db - this will put salt and also hashed the password given by the user
UserLoginSchema.pre('save', async function (next){
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
})

//static method to login user
UserLoginSchema.statics.login = async function(name, password) {
    const user = await this.findOne({ name });
    console.log('Retrieved User:', user);
    if(user) {
        const auth = await bcrypt.compare(password, user.password);
        if(auth){
            return user;
        }
        throw Error('Incorrect Password');
    }
    throw Error('Incorrect Username');
}

const userCollection = new mongoose.model("UserLogInCollection", UserLoginSchema);

module.exports = { userCollection };