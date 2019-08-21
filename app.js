//Express
const express = require('express');
const app = express();

//Pug
const path = require('path');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//Mapping public folder as route '/static'
app.use('/static', express.static(path.join(__dirname, 'public')))
app.get('/favicon.ico', (req, res) => res.redirect('/static/favicon.ico'));

const { check, validationResult } = require('express-validator');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));

const itemsPerPage = 10;

//const db = require('./models'); //typical way to get Sequelize DB object
//using app.set instead as per:
//https://www.redotheweb.com/2013/02/20/sequelize-the-javascript-orm-in-practice.html
app.set('models', require('./models'));
const Sequelize = require('sequelize');

app.get('/', (req, res, next) => {
  try
  {
      res.redirect('/books');
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.get('/books', (req, res, next) => {
  try
  {
  //next(new Error('Request could not be fulfilled'));
     let page = parseInt(req.query.page);
      if (!page) {  //if page == null
        page = 1;

    }

      const offset = (page-1) * itemsPerPage;
      const Book = app.get('models').Book;

      const getBooksOffset = Book.findAll({
          order: [
              ['author', 'ASC'],
              ['title', 'ASC'],
          ],
          limit: itemsPerPage, 
          offset: offset
      });

      const getTotalBooks = Book.count();

      Promise
      .all([getBooksOffset, getTotalBooks])
      .then((responses) => {
          const queryOffsetList = responses[0];
          const pageCount = Math.ceil(responses[1] / itemsPerPage);
          res.render("index", {
              bookList: queryOffsetList,
              page: page,
              pageCount: pageCount
          });
      });
      
  }
  catch (e) {
      next(new Error(e));
  }
});

app.get('/books/new', (req, res, next) => {
  try
  {
     res.render("new-book");
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.post('/books/new', [
  check('title', 'Name is required').not().isEmpty(),
  check('author', 'Author is required').not().isEmpty()
], (req, res, next) => {
try
{
  const errors = validationResult(req);

  if (!errors.isEmpty())
  {
      return res.render('new-book', { errors: errors.array(), title: req.body.title,
          author: req.body.author, genre: req.body.genre, year: req.body.year })
  }
  else
  {
      const Book = app.get('models').Book;
      Book.create({
          title: req.body.title,
          author: req.body.author,
          genre: req.body.genre,
          year: req.body.year
      })
      .then(() => {
          res.redirect('/books');
      });
  }
}
catch (e) {
  next(new Error('Request could not be fulfilled'));
}
});

//primary key https://sequelize.org/master/class/lib/model.js~Model.html#static-method-findByPk
app.get('/books/:id', (req, res, next) => {
  try
  {
      const Book = app.get('models').Book;
      Book.findByPk(req.params.id).then((foundBook) => {
          res.render("update-book", { id: foundBook.id, title: foundBook.title,
              author: foundBook.author, genre: foundBook.genre, year: foundBook.year });
      });
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

// 6th Route:  Define route for 'update' (POST - send information)
//             book for ID :id - ? view
app.post('/books/:id',  [
      check('title', 'Name is required').not().isEmpty(),
      check('author', 'Author is required').not().isEmpty()
  ], (req, res, next) => {
  try
  {
      const errors = validationResult(req);

      if (!errors.isEmpty())
      {
          return res.render('update-book', { errors: errors.array(), title: req.body.title,
              author: req.body.author, genre: req.body.genre, year: req.body.year, id: req.params.id })
      }
      else
      {
          const Book = app.get('models').Book;

          Book.update({
              title: req.body.title,
              author: req.body.author,
              genre: req.body.genre,
              year: req.body.year
              },
              {where: {id: req.params.id}
              }
          )
          .then(() => {
              res.redirect('/books');
          });
      }
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.post('/books/:id/delete', (req, res, next) => {
  try
  {
      const Book = app.get('models').Book;
      Book.destroy({
          where: {id: req.params.id}
      }).then(() => {
          res.redirect('/books');
      });
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.get('/search', (req, res, next) => {
  try
  {
     res.render("search-book");
  }
  catch (e) {
      next(new Error('Request could not be fulfilled'));
  }
});

app.post('/search', (req, res, next) => {
try
{
      const Op = Sequelize.Op;
      const Book = app.get('models').Book;
      Book.findAll({
        where: {
          [Op.and]: {
            title: {
              [Op.like]: '%' + req.body.title + '%'
            },
            author: {
              [Op.like]: '%' + req.body.author + '%'
            },
            genre: {
              [Op.like]: '%' + req.body.genre + '%'
            },
            year: {
              [Op.like]: '%' + req.body.year + '%'
            }
          }
        },
        order: [
              ['author', 'ASC'],
              ['title', 'ASC'],
          ]
      })
      .then((queryReturn) => {
          res.render("search-results", {
              bookList: queryReturn,
          });
      });
  
}
catch (e) {
  next(new Error('Request could not be fulfilled'));
}
});

//default route - respond to anything besides those above
app.use((req, res, next) => {
  console.log("Requested route is undefined.");
  res.render("page-not-found");
});

const newLocal = 500;
//error route: reached from any of the non-default in the
//event of an error (error handler)
app.use((err, req, res, next) => {
    console.log(err);    
    if(!res.headersSent){
      res.status(newLocal);
      res.render('error', {error: err});
    }
  });

//Host
const portNumber = 3000;
app.listen(portNumber);
console.log("App started on localhost at port " + portNumber);