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
    folder: 'blog_covers', 
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'svg', 'bmp', 'tiff', 'heic'],
  },
});

const upload = multer({ storage: storage });

router.get('/add-new', (req, res) => {
    return res.render('addblog',{
        user: req.user,
    })
});

router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('createdBy');
    const comments = await Comment.find({ blogId: req.params.id }).populate("createdBy");
    return res.render('blog' ,{
      user: req.user,
      blog,
      comments,
    });
  } catch (error) {
    console.error("Error fetching blog details:", error.message);
    return res.status(404).send("Blog not found.");
  }
});

router.post('/comment/:blogId', async (req, res) => {
  try {
    if (!req.user) return res.status(401).send("You must be logged in to comment.");
    
    await Comment.create({
      content: req.body.content,
      blogId: req.params.blogId,
      createdBy: req.user._id,
    });
    return res.redirect(`/blog/${req.params.blogId}`);
  } catch (error) {
    console.error("Error creating comment:", error.message);
    return res.status(500).send("Failed to post comment.");
  }
});

// 3. Updated dynamic post route with custom format error handling
router.post('/', (req, res) => {
    // 1. Initialize the upload function manually
    const uploadMiddleware = upload.single("coverimage");

    // 2. Run the upload and catch any errors it throws immediately
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            console.error("File Format/Upload Error:", err.message);
            // This is what the user will see on the screen instead of crashing!
            return res.status(400).send("Wrong Image Format. Please go back and try again with a supported image.");
        }

        // 3. If upload is successful, proceed with database creation safely
        try {
            if (!req.user) {
                return res.status(401).send("Unauthorized: Please log in to create a blog.");
            }

            const { title, body } = req.body;
            
            const coverImageURL = req.file ? req.file.path : '/images/default-cover.png';

            const blog = await Blog.create({
              body,
              title,
              createdBy: req.user._id,
              coverImageURL: coverImageURL 
            });
            
            return res.redirect(`/blog/${blog._id}`);
            
        } catch (error) {
            console.error("Database Error:", error.message || error);
            return res.status(500).send("An error occurred while saving the blog.");
        }
    });
});

// GET Route: Render the edit page
router.get('/edit/:id', async (req, res) => {
    try {
        if (!req.user) return res.status(401).send("You must be logged in.");

        const blog = await Blog.findById(req.params.id);
        if (!blog) return res.status(404).send("Blog not found.");

        // Check ownership: convert both ObjectIds to strings to ensure an exact match
        if (blog.createdBy.toString() !== req.user._id.toString()) {
            return res.status(403).send("Unauthorized: You do not have permission to edit this blog.");
        }

        return res.render('editBlog', {
            user: req.user,
            blog: blog
        });
    } catch (error) {
        console.error("Error loading edit page:", error.message);
        return res.status(500).send("Internal Server Error");
    }
});

// POST Route: Handle the blog update
router.post('/edit/:id', (req, res) => {
    const uploadMiddleware = upload.single("coverimage");

    uploadMiddleware(req, res, async (err) => {
        if (err) {
            console.error("File Format/Upload Error:", err.message);
            return res.status(400).send("Wrong Image Format. Please try again with a supported image.");
        }

        try {
            if (!req.user) return res.status(401).send("You must be logged in.");

            const blog = await Blog.findById(req.params.id);
            if (!blog) return res.status(404).send("Blog not found.");

            // Check ownership again on submission
            if (blog.createdBy.toString() !== req.user._id.toString()) {
                return res.status(403).send("Unauthorized: You do not have permission to edit this blog.");
            }

            // Update title and body
            blog.title = req.body.title;
            blog.body = req.body.body;

            // If the user uploaded a NEW image, update the URL. 
            // If they didn't, it safely ignores this and keeps their old image.
            if (req.file) {
                blog.coverImageURL = req.file.path;
            }

            await blog.save();
            return res.redirect(`/blog/${blog._id}`);

        } catch (error) {
            console.error("Database Error during update:", error.message || error);
            return res.status(500).send("An error occurred while updating the blog.");
        }
    });
});

module.exports = router;
