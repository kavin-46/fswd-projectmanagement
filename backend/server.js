const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();

app.use(cors({
    origin: true
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Atlas Connected"))
.catch(err => console.log("MongoDB Error:", err.message));

// User Schema
const userSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    }
});

const User = mongoose.model("User", userSchema);

// Task Schema
const taskSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["Pending", "In Progress", "Completed"],
        default: "Pending"
    }
}, { timestamps: true });

const Task = mongoose.model("Task", taskSchema);

// Authentication
function authenticate(req, res, next) {

    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Please login first"
        });
    }

    try {

        const token = auth.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.userId = decoded.userId;

        next();

    } catch (error) {

        return res.status(401).json({
            message: "Invalid or expired token"
        });
    }
}

// Home Route
app.get("/", (req, res) => {
    res.send("Project Management API is running");
});

// Register
app.post("/register", async (req, res) => {

    try {

        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({
                message: "Enter all details"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                message: "Password must contain at least 6 characters"
            });
        }

        const existing = await User.findOne({
            userId: userId.trim()
        });

        if (existing) {
            return res.status(400).json({
                message: "User ID already exists"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            userId: userId.trim(),
            password: hashedPassword
        });

        res.status(201).json({
            message: "Registration successful"
        });

    } catch (error) {

        res.status(500).json({
            message: "Registration failed"
        });
    }
});

// Login
app.post("/login", async (req, res) => {

    try {

        const { userId, password } = req.body;

        const user = await User.findOne({
            userId: userId?.trim()
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid User ID or Password"
            });
        }

        const valid = await bcrypt.compare(
            password || "",
            user.password
        );

        if (!valid) {
            return res.status(401).json({
                message: "Invalid User ID or Password"
            });
        }

        const token = jwt.sign(
            { userId: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            userId: user.userId
        });

    } catch (error) {

        res.status(500).json({
            message: "Login failed"
        });
    }
});

// Get Tasks
app.get("/tasks", authenticate, async (req, res) => {

    try {

        const tasks = await Task.find({
            userId: req.userId
        }).sort({ createdAt: -1 });

        res.json(tasks);

    } catch (error) {

        res.status(500).json({
            message: "Unable to fetch tasks"
        });
    }
});

// Add Task
app.post("/tasks", authenticate, async (req, res) => {

    try {

        const name = req.body.name?.trim();

        if (!name) {
            return res.status(400).json({
                message: "Task name required"
            });
        }

        const task = await Task.create({
            userId: req.userId,
            name
        });

        res.status(201).json(task);

    } catch (error) {

        res.status(500).json({
            message: "Unable to add task"
        });
    }
});

// Update Task
app.put("/tasks/:id", authenticate, async (req, res) => {

    try {

        const { status } = req.body;

        if (!["Pending", "In Progress", "Completed"].includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const task = await Task.findOneAndUpdate(
            {
                _id: req.params.id,
                userId: req.userId
            },
            { status },
            { new: true, runValidators: true }
        );

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json(task);

    } catch (error) {

        res.status(500).json({
            message: "Unable to update task"
        });
    }
});

// Delete Task
app.delete("/tasks/:id", authenticate, async (req, res) => {

    try {

        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId
        });

        if (!task) {
            return res.status(404).json({
                message: "Task not found"
            });
        }

        res.json({
            message: "Task deleted successfully"
        });

    } catch (error) {

        res.status(500).json({
            message: "Unable to delete task"
        });
    }
});

// Start Server
mongoose.connection.once("open", () => {

    if (!process.env.JWT_SECRET) {
        console.error("JWT_SECRET is missing");
        process.exit(1);
    }

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });

});
