require("dotenv").config();

const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const Blog = require("./models/blog");

const userRoute = require("./routes/user");
const blogRoute = require("./routes/blog");

const { checkforAuthenticationCookie } = require("./middlewares/auth");

const app = express();
const PORT = process.env.PORT || 8000;

mongoose
.connect(process.env.MONGO_URL)
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log("mongodb connection failed", err));

app.set('view engine', 'ejs');
app.set('views', path.resolve("./views"));


app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(checkforAuthenticationCookie("token"));
app.use(express.static(path.resolve("./public")));

app.get('/',async (req, res) => {
    const allBlogs = await (await Blog.find({}));
    res.render("home" , {
        user: req.user,
        blogs: allBlogs,
    });
})

app.use("/users", userRoute);
app.use("/blog", blogRoute);

app.listen(PORT, ()=> console.log(`server started at: ${PORT}`));