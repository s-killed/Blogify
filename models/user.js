const { createHmac, randomBytes, hash } = require('node:crypto');
const {createTokenForUser,validateToken} = require('../services/auth');
const { Schema, model } = require("mongoose");
const { type } = require('node:os');

const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    salt: {
        type: String,
    },
    profileImageUrl: {
        type: String,
        default: '/images/defaultimg.png',
    },
    role: {
        type: String,
        enum: ["USER", "ADMIN"],
        default: "USER",
    }
},
    { timestamps: true }
);

userSchema.pre('save', function () {
    const user = this;

    if (!user.isModified("password")) return;

    const salt = randomBytes(16).toString();
    const hashedPassword = createHmac('sha256', salt).update(user.password).digest("hex");

    this.salt = salt;
    this.password = hashedPassword;

    
});

userSchema.static('matchPasswordAndGenerateToken',async function (email, password) {
    const user = await this.findOne({ email });
    if (!user) throw new Error('User not found');
    
    const salt = user.salt;
    const hashedPassword = user.password;

    const userProvivedHash = createHmac('sha256', salt)
    .update(password)
    .digest("hex");

    if(hashedPassword !== userProvivedHash) throw new Error('Incorrect Password');

    const token = createTokenForUser(user);
    return token;

})

const User = model('user', userSchema);

module.exports = {
    User,
}