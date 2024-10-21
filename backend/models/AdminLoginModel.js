const mongoose=require("mongoose");
const bcrypt = require('bcrypt'); //package that hash passwords
const cron = require('node-cron') //this is a package to schedule a deletion at report Collection


/*this is a template data contents of the admin*/
const AdminLoginSchema = new mongoose.Schema({
    name:{
        type:String,
        required: [true, 'Please enter a name'],
        unique: true
    },
    password:{
        type:String,
        required: [true, 'Please enter a password'],
        minlength: [8, 'Minimum password length is 8 characters']
    },
    /*new code here*/
    role:{
        type:String,
        default:"admin"
    },
    isApproved:{  //This is for admin requests, the master admin should change the value into true
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
AdminLoginSchema.pre('save', async function (next){
    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(this.password, salt);
    next();
})

//static method to login user
AdminLoginSchema.statics.login = async function(name, password) {
    const admin = await this.findOne({ name });
    console.log('Retrieved User:', admin);
    if(admin) {
        const auth = await bcrypt.compare(password, admin.password);
        if(auth){
            return admin;
        }
        throw Error('Incorrect Password');
    }
    throw Error('Incorrect Username');
}

const adminLogInRequests = new mongoose.model("AdminLogInRequests", AdminLoginSchema);

module.exports = { adminLogInRequests };