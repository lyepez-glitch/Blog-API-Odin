const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
var jwt = require('jsonwebtoken');

const express = require('express')
const cors = require('cors');
require('dotenv').config();

const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;

const bcrypt = require('bcryptjs');
const app = express()
const port = process.env.EPORT || 4000;
const path = require('path');
const bodyParser = require('body-parser')
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));

app.use(express.json());

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.use(
    session({
        cookie: {
            maxAge: 7 * 24 * 60 * 60 * 1000 // ms
        },
        secret: 'a santa at nasa',
        resave: true,
        saveUninitialized: true

    })
);
app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
passport.use(
    new LocalStrategy(async(username, password, done) => {
        try {
            console.log(47, username, password)

            // const { rows } = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
            const user = await prisma.user.findUnique({
                where: { email: username }
            });
            // const user = rows[0];
            console.log(50, user)
            if (!user) {
                return done(null, false, { message: "Incorrect username" });
            }
            const match = await bcrypt.compare(password, user.password);
            console.log('match', match, password, user.password)
            if (!match) {
                // passwords do not match!
                return done(null, false, { message: "Incorrect password" })
            }

            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async(id, done) => {
    try {

        const user = await prisma.user.findUnique({
            where: { id: id }
        });
        // const user = rows[0];

        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

app.get("/signUp", (req, res) => {
    res.render("signUp", {});
});
app.post("/signUp", (req, res) => {
    let { fname, lname, email, password } = req.body;
    bcrypt.hash(password, 10, async(err, hashedPassword) => {


        const insertedUser = await prisma.user.create({
            data: {
                firstName: fname,
                lastName: lname,
                email: email,
                password: hashedPassword
            }
        });


        console.log('insertedUser', insertedUser)
        res.redirect('/log-in');

    });
});

app.get("/log-in", (req, res) => {
        res.render("login", {});
    })
    // app.post("/log-in", async(req, res) => {
    //     const { username, password } = req.body;
    //     const user = await prisma.user.findUnique({
    //         where: { email: username }
    //     })
    //     req.user = user;
    //     jwt.sign({ user }, 'secretkey', { expiresIn: '30s' }, (err, token) => {
    //             res.json({
    //                 token
    //             })
    //         })
    //         // res.redirect('/');

// })
const accessTokenSecret = 'youraccesstokensecret';
app.post('/log-in', async(req, res) => {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({
        where: { email: username }
    })
    if (user) {
        const accessToken = jwt.sign({ user }, accessTokenSecret);

        res.json({
            accessToken
        });
    }
})

function verifyToken(req, res, next) {
    const bearerHeader = req.headers['authorization'];
    console.log('Authorization Header:', bearerHeader);

    if (bearerHeader && typeof bearerHeader === 'string') {
        const bearer = bearerHeader.split(' ');
        console.log('Bearer Array:', bearer);

        if (bearer.length === 2 && bearer[0] === 'Bearer') {
            const token = bearer[1];
            req.token = token;
            console.log('Token:', token);
            next();
        } else {
            console.error('Invalid Authorization Header Format');
            res.sendStatus(403); // Forbidden
        }
    } else {
        console.error('No Authorization Header Provided');
        res.sendStatus(403); // Forbidden
    }
}

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    console.log('header', req.headers);
    const token = authHeader && authHeader.split(" ")[1]
    console.log('token', token);
    if (token == null) return res.sendStatus(401);
    jwt.verify(token, accessTokenSecret, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        console.log("req user", req.user)
        next();
    })
}
app.get("/", authenticateToken, async(req, res) => {
    console.log('req.user', req.user)

    const userId = req.user.user.id;
    res.send("test")
});

app.get("/view2/comments/delete/:id", async(req, res) => {
    console.log('delete')
    const deleteComment = await prisma.comment.delete({
        where: {
            id: parseInt(req.params.id)
        },
    })
    console.log('deleteComment', deleteComment)
    res.redirect('/view2posts?view=b')
})
app.post("/view2/comments/edit/:postId/:id", async(req, res) => {
    const { text, username } = req.body;
    const { postId, id } = req.params;
    const updatedComment = await prisma.comment.update({
        where: {
            id: parseInt(req.params.id)
        },
        data: {
            username,
            email: username,
            text,
            post: {
                connect: { id: parseInt(postId) }
            }
        },

    })
    console.log('updated Comment', updatedComment)
    res.redirect('/view2posts?view=b')
})
app.get("/view2posts", async(req, res) => {
    const view = req.query.view;
    const foundUser = await prisma.user.findUnique({
        where: { id: 4 },
        include: {
            posts: {
                include: {
                    comments: true
                }
            }

        },
    })
    if (view === 'a') {
        res.render("index", { user: foundUser })
    } else {
        res.json({ user: foundUser, posts: foundUser.posts })
    }




})

app.get("/comments", async(req, res) => {
    res.send("this is home");


})

app.post("/post/:id/toggle", async(req, res) => {
    console.log(220, 'toggle')
    const { id } = req.params;
    const post = await prisma.post.findUnique({
        where: { id: parseInt(id) },
    });

    const updatedPost = await prisma.post.update({
        where: { id: parseInt(id) },
        data: {
            published: !post.published,
            author: {
                connect: { id: 4 }
            }
        },
    })
    res.redirect('/view2posts?view=b')
})
app.post("/comments", async(req, res) => {
    console.log('req body', req.body)
    const { text, postId, name, email, username } = req.body;
    const newComment = await prisma.comment.create({

        data: {
            email,
            username,
            text,
            post: { connect: { id: parseInt(postId) } },

        },
    })
    console.log('newComment', newComment)

    res.redirect('/');
})

app.post("/view2/comments", async(req, res) => {
    console.log('req body', req.body)
    const { text, postId, name, email, username } = req.body;
    const newComment = await prisma.comment.create({

        data: {
            email,
            username,
            text,
            post: { connect: { id: parseInt(postId) } },

        },
    })
    console.log('newComment', newComment)

    res.redirect('/view2posts?view=b');
})

app.put("/comments/:id", async(req, res) => {
    res.send("this is home");

})
app.delete("/comments/:id", async(req, res) => {
    res.send("this is home");
})

app.get("/posts", async(req, res) => {
    const posts = await prisma.post.findMany({
        where: { id: 2 },
    })
    res.render("createPost", { posts });

})
app.post("/posts", async(req, res) => {
    console.log('req body', req.body);
    const { title, content } = req.body;
    const newPost = await prisma.post.create({
        data: {
            title,
            content,
            author: {
                connect: { id: 4 }
            }
        }
    })



    console.log("new post", newPost)
    res.redirect('/');

})

app.post("/view2/posts", async(req, res) => {
    console.log('req body', req.body);
    const { title, content } = req.body;
    const newPost = await prisma.post.create({
        data: {
            title,
            content,
            author: {
                connect: { id: 4 }
            }
        }
    })



    console.log("new post", newPost)
    res.redirect('/view2posts?view=b')

})

app.get("/posts/:id/edit", async(req, res) => {
    //
    const { id } = req.params;
    const post = await prisma.post.findUnique({
        where: { id: parseInt(id) }
    })


    res.render("editPost", { post });

})

app.post("/posts/:id/edit", async(req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    const post = await prisma.post.findUnique({
        where: { id: parseInt(id) }
    })
    const updatedPost = await prisma.post.update({

        where: { id: parseInt(id) },
        data: {
            title,
            content
        },
    })
    console.log("updated", updatedPost)
    res.redirect('/');
})


app.get("/posts/:id/publish", async(req, res) => {
    const { id } = req.params;

    const post = await prisma.post.findUnique({
        where: { id: parseInt(id) }
    })
    const updatedPost = await prisma.post.update({

        where: { id: parseInt(id) },
        data: {
            published: true


        },
    })
    console.log("published", updatedPost)
    res.redirect('/');
})

app.get("/log-out", (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect("/");
    });
});


















app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
})