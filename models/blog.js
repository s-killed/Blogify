const { Schema, model } = require("mongoose");
const { timeStamp } = require("node:console");

const blogSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    coverImageURL: {
        type: String,
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'user',
    },
}, 
{timeStamps: true}
);

const Blog = model('blog', blogSchema);

module.exports = Blog;
