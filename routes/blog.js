const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const Blog = require("../models/blog");
const Comment = require("../models/comment");
const router = express.Router();

// 1. Configure Cloudinary using your .env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Set up Cloudinary storage engine instead of diskStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'blog_covers', // Folder name inside your Cloudinary account
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

router.get('/add-new', (req, res) => {
    return res.render('addblog',{
        user: req.user,
    })
});

router.get('/:id', async (req, res) => {
  const blog = await Blog.findById(req.params.id).populate('createdBy');
  const comments = await Comment.find({ blogId: req.params.id }).populate(
    "createdBy"
  );
  return res.render('blog' ,{
    user: req.user,
    blog,
    comments,
  });
});

router.post('/comment/:blogId', async (req, res) => {
  const comment = await Comment.create({
    content: req.body.content,
    blogId: req.params.blogId,
    createdBy: req.user._id,
  });
  return res.redirect(`/blog/${req.params.blogId}`);
});

// 3. Updated dynamic post route
router.post('/', upload.single("coverimage"), async (req, res) => {
    const { title, body } = req.body;
    
    // Check if file exists, use the cloud path, otherwise fallback to a default image
    const coverImageURL = req.file ? req.file.path : '/images/default-cover.png';

    const blog = await Blog.create({
      body,
      title,
      createdBy: req.user._id,
      coverImageURL: coverImageURL // Saves the absolute Cloudinary URL (https://res.cloudinary.com/...)
    });
    
    return res.redirect(`/blog/${blog._id}`);
});

module.exports = router;
