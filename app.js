const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const express = require('express')

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

app.post(
    "/log-in",
    passport.authenticate("local", {
        successRedirect: "/",
        failureRedirect: "/log-in"
    })
);

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/log-in');
}
app.get("/", isAuthenticated, async(req, res) => {
    let posts;
    let user = res.locals.currentUser;
    const { id } = res.locals.currentUser;
    const foundUser = await prisma.user.findUnique({
        where: { id: id },
        include: {
            posts: true

        },
    })

    console.log('user', foundUser);
    res.render("index", { user: foundUser });

})


app.get("/comments", async(req, res) => {
    res.send("this is home");

})
app.post("/comments", async(req, res) => {
    res.send("this is home");

})

app.put("/comments/:id", async(req, res) => {
    res.send("this is home");

})
app.delete("/comments/:id", async(req, res) => {
    res.send("this is home");

})

app.get("/posts", async(req, res) => {
    res.render("createPost", {});

})
app.post("/posts", async(req, res) => {
    const { id } = res.locals.currentUser;
    const { title, content } = req.body;
    const newPost = await prisma.post.create({
        data: {
            title,
            content,
            author: {
                connect: { id: id }
            }
        }
    })



    console.log("new post", newPost)
    res.redirect('/');

})

app.get("/posts/:id/edit", async(req, res) => {
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




















app.listen(3000, () => {
    console.log(`Example app listening on port ${3000}`)
})